---
title: "CS537 Queue：怎样正确地睡眠与唤醒？"
slug: cs537-queue
date: 2026-11-13
categories: ["操作系统"]
tags: ["CS537", "并发", "条件变量"]
summary: "从 guard 与 setpark，到条件变量和有界队列：保存状态、原子等待、醒后重查，才不会把线程留在睡眠里。"
description: "CS537 Fall 2019 · Concurrency: Queue 学习笔记"
draft: false
---

接着[昨天的 Locks](../cs537-locks/)：锁回答“谁能进临界区”，今天进一步问：**条件没满足时，怎样交出 CPU 等待，又不漏掉唤醒？**

## 1. 阻塞仍然在等，省掉的是什么？

我一开始疑惑：“阻塞不也要等很久吗？”要区分**等待延迟**和**等待期间消耗的 CPU 时间**。

- 自旋：运行时反复检查，仍可被抢占；不是一定霸占 CPU 到别人无法运行。
- 阻塞：等待期间不参与普通就绪调度；被唤醒后还要等调度，可能还要抢锁。

所以阻塞省的是空转，不保证每个线程更快。等待极短时，自旋可能更划算。

这里还要区分两个“队列”：**锁的等待队列装线程，有界缓冲区装业务数据**，两者不是一回事。

## 2. guard 保护队列，setpark 补上睡前窗口

这版教学阻塞锁中，`lock` 表示业务锁是否占用，`guard` 保护锁状态与等待队列的操作。

| 课程里的追问 | 记忆答案 |
| --- | --- |
| 为什么要 guard？ | 避免检查锁状态、入队、出队彼此交错破坏协议 |
| 为什么可以在 guard 上自旋？ | 保护的操作很短，不是因为自旋能保证立即执行 |
| 唤醒等待者时为何不清零 lock？ | 直接把所有权交给它，避免新来者插队；不是“释放队列” |
| 有 guard 就没有竞态了吗？ | 还要检查放开 guard 到真正睡眠之间的窗口 |

没有 `setpark()` 时，可能发生：

```text
A：入队 → 释放 guard → 被切走
B：拿到 guard → 出队 A → unpark(A)
A：恢复 → park() → 错过唤醒，可能一直睡眠
```

这套教学接口的修补顺序是：

```c
// 此时持有 guard；语义伪代码，未做运行实验
queue_add(q, tid);
setpark();          // 必须在释放 guard 前登记睡眠意图
release_guard();
park();
```

**如果 unpark 发生在 setpark 之后、park 之前，后续 park 就不阻塞。** 对话中“setpark 放在 guard 外也行”不成立：那会重新暴露登记前的窗口。也不能抱着 guard 睡，否则释放业务锁的一方可能拿不到 guard。

这是带等待队列的阻塞锁方案，不能把所有叫“队列锁”的实现都当成睡眠锁。

## 3. 条件变量：状态有记忆，通知没有

条件变量配合互斥锁等待**共享状态上的条件**，例如 `count > 0`、`done == true`。

`pthread_cond_wait(&cv, &m)` 的语义：**调用时持有 m → 原子地释放 m 并进入等待 → 返回前重新持有 m**。原子性针对释放与等待协议，不是整个睡眠过程禁止其他线程运行。

我卡住的“生产者已经 unlock，消费者为什么还要拿锁”，关键在于：**生产者放锁，不等于把锁直接交给消费者。** `signal` 也不释放 mutex，更不保证被唤醒者立刻运行。消费者从 wait 返回时必须重新持锁，才能安全地检查、操作共享状态。

只写“父线程 wait，子线程 signal”会漏掉子线程先结束的情况。应由子线程在同一把锁下设 `done = true` 并通知；父线程在锁内执行 `while (!done) wait(...)`。即使早先的通知无人接收，后来者也能从 `done` 看出不必等。

**while 不是补发通知器。** 它解决的是醒来后重查；还必须有持久状态、同一把锁，以及正确的等待和通知协议。

## 4. 有界队列：一把锁、两个条件、while 重查

记住不变量：**`0 <= count <= CAP`**。生产者等非满，消费者等非空；只要触及队列和计数，就遵守同一把 mutex。

下面根据教材的双条件变量方案整理。是 **POSIX 接口教学片段**，省略错误处理与环形数组实现，未做运行实验。假设 `CAP > 0`、`count` 初值为 0；`buffer_put/get` 只移动数据和下标，不修改 `count`。

```c
pthread_mutex_t m = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t not_full  = PTHREAD_COND_INITIALIZER;
pthread_cond_t not_empty = PTHREAD_COND_INITIALIZER;

void put(int value) {
    pthread_mutex_lock(&m);
    while (count == CAP)
        pthread_cond_wait(&not_full, &m);
    buffer_put(value);
    ++count;
    pthread_cond_signal(&not_empty);
    pthread_mutex_unlock(&m);
}

int get(void) {
    pthread_mutex_lock(&m);
    while (count == 0)
        pthread_cond_wait(&not_empty, &m);
    int value = buffer_get();
    --count;
    pthread_cond_signal(&not_full);
    pthread_mutex_unlock(&m);
    return value;
}
```

三个重点：

1. **while 而非 if**：醒来不代表条件仍成立，可能被其他线程抢先改变，也可能虚假唤醒。
2. **分开 not_empty / not_full**：共用一个条件变量再 signal，可能唤醒同类，让真正能推进的一方继续睡眠。
3. **操作和通知都放在锁内**：这是此处清晰、易核对的写法；不应泛化为 POSIX 绝对禁止在锁外 signal。关键是共享条件的同步协议。

## 5. signal 与 broadcast 怎么选？

`signal` 至少唤醒一个等待者（若有），**不保证严格只唤醒一个或按 FIFO 点名**；`broadcast` 唤醒当前全部等待者。两者都不存储未来的“通行证”，醒来都要重新拿 mutex 并检查条件。

放入一个元素，通常通知一个消费者即可；关闭队列这类所有等待者都应重新判断的状态变化，可以 broadcast，但需要额外的关闭状态与退出逻辑。广播后大家仍会竞争 mutex，不是一起进入临界区；过多无效唤醒会增加开销。

**回看只记这一句：锁保护状态，条件变量安排等待；不满足就 wait，醒来先重查，状态变化再通知。**

## 核对资料

- [OSTEP 第 28 章 §28.14](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-locks.pdf)：guard、所有权移交与 setpark 的顺序。
- [OSTEP 第 30 章](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-cv.pdf)：条件变量、join、双条件变量有界缓冲区与 broadcast。
- [POSIX 条件变量通知接口](https://man7.org/linux/man-pages/man3/pthread_cond_broadcast.3p.html)：signal 的唤醒数量、调度顺序与锁的要求。
- 前置：[CS537 Locks：加锁为什么还允许线程切换？](../cs537-locks/)——先区分互斥与调度，再理解等待协议。
