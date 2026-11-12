---
title: "CS 168 · Distance-Vector：从邻居通告到收敛"
slug: cs168-distance-vector
date: 2026-11-12
categories: ["CS 168"]
tags: ["距离向量", "Bellman-Ford"]
summary: "记住今天的几个卡点：看图判合法不等于分布式选路；松弛要加上链路成本；当前下一跳报坏消息也要更新；收敛不代表协议停止。"
description: "UCB CS168 SP25 · Lecture 5 Distance-Vector 学习笔记"
draft: false
---

今天学习 **UCB CS168 SP25 Lecture 5：Distance-Vector**。围绕提问，只留这条主线：**听邻居报距离，加上到邻居的成本，决定下一跳。**

## 1. 图明明很好判断，为什么还要讲合法性？

**我看图有全局视角，路由器只有局部信息。**

固定一个目的地，把各路由器的下一跳画成箭头：都能沿箭头抵达目的地，才是合法的交付树；有环或中途走不通就不合法。**合法只保证送得到，不保证成本最低。**

还要分清三件事：

| 在做什么 | 需要知道什么 |
| --- | --- |
| 检查交付树是否合法 | 全局下一跳关系 |
| Routing：生成、维护表 | 邻居交换信息，逐步计算 |
| Forwarding：转发一个包 | 查本地表，按下一跳发送 |

所以开销主要来自**维护表项、交换通告和重新收敛**，不是每来一个包就重新计算整条路径。[路由状态与交付树](https://textbook.cs168.io/routing/solutions.html#directed-delivery-trees)

**硬编码**只是预先写入规则。课件先给 R1 一条到 A 的静态条目作为传播起点；不能因此把“静态”与“直连”当同义词。静态路由也可以经由别的路由器。

## 2. Bellman–Ford 到底在更新什么？

固定目的地 A，对每个邻居分别算：

```text
经邻居到 A 的候选成本 = 到邻居的链路成本 + 邻居通告的到 A 成本
```

**不能只比较邻居报出的数字。** 例如 `1 + 5 = 6` 比 `10 + 3 = 13` 更好，虽然第二个邻居报出的 3 更小。

下面按课件第 22 页改写，展示**集中式、固定拓扑**的教学版本；不是可直接使用的 DV 路由器，也没有做网络实验：

```python
def distances_to(dst, nodes, arcs):
    # (me, via, cost)：me 可以沿该有向边走到邻居 via
    # 无向链路需要在 arcs 中提供两个方向
    distance = {node: float("inf") for node in nodes}
    next_hop = {node: None for node in nodes}
    distance[dst] = 0

    for _ in range(len(nodes) - 1):
        for me, via, cost in arcs:
            candidate = cost + distance[via]
            if candidate < distance[me]:
                distance[me] = candidate
                next_hop[me] = via

    return distance, next_hop
```

这里 `distance[me]` 是 **me 到 dst** 的距离；更新后先交给 `via`，所以 `next_hop[me] = via`。

在本课非负链路成本的模型下，可取一条至多有 `N−1` 条边的最短简单路径，故集中式完整扫边 `N−1` 轮足够；原地更新时，一轮也可能传播多跳。

**真实 DV 没有全局扫边循环：每台路由器收到邻居通告后，在本地做松弛，彼此异步。** 因而 `N−1` 不是实际耗时，也不是拓扑变化后的统一收敛轮数。[课件](https://docs.google.com/presentation/d/1bwx7O8ZLDfFKeZzOrqcUg_X8F13j6SM62DHJ8gEk7ho/edit)第 21–22 页可对照。

## 3. 为什么下一跳报了更差的距离，也得接受？

因为**旧价格也来自它，不能只信旧的便宜报价**。

R3 当前经 R2 到 A，R3–R2 链路成本为 1：

| R2 通告的成本 | R3 经 R2 的成本 |
| --- | --- |
| 原来 3 | 1 + 3 = 4 |
| 现在 8 | **1 + 8 = 9** |

只保留 4，就还在使用过时估计。**变贵不一定是断链，也不必然已经形成环路。**

记住本课的更新条件，满足任一项就接受：

- 还没有到该目的地的条目；
- 候选成本更低；
- **通告来自当前下一跳，即使成本变大。**

## 4. 收敛之后，协议就结束了吗？

**收敛是路由选择与成本稳定，不是停止通信。** 拓扑稳定、信息持续有效传播时，DV 逐渐得到最小成本路线；拓扑再变，就需要重新调整。周期性通告和条目刷新仍可继续。

关于“网络大了表会不会很大”：按目的地逐项存储确实有成本。但**“通知所有邻居”不等于“每次变化都必须发送整张表”**，不能直接推成“DV 一概无法扩展”。[分布式路由的局部视角](https://textbook.cs168.io/routing/model.html#routing-protocols-are-distributed)

> 回看时自问：我是在判图、算表还是转发？候选成本加链路了吗？是谁发来的更新？表稳定了，为什么还要通告？

下一次再接着整理周期重传、条目过期和防环机制，不把它们混进今天的核心问题。

## 资料

- [SP25 课程日历](https://sp25.cs168.io/#calendar)：第 5、6 讲共用 Distance-Vector 课件。
- [官方 Distance-Vector 章节](https://textbook.cs168.io/routing/distance-vector.html)：更新条件与收敛相关说明。

本文从今天的提问整理，并按官方材料修正了对话中的不准确表述。
