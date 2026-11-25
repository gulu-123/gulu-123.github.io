---
title: "CS 168 · 路由器如何在一条流水线上查表转发"
slug: cs168-routers
date: 2026-11-25
categories: ["CS 168"]
tags: ["路由器", "最长前缀匹配", "Trie"]
summary: "沿一个 IP 包走过路由器，分清管理面、控制面和数据面，弄懂线卡与交换结构，再手推一次 Trie 的最长前缀匹配。"
description: "UCB CS168 SP25 · Lecture 8 Routing 4 — Routers 学习笔记"
draft: false
---

学完第 7 讲的链路状态与 IP 寻址，第 8 讲把视角移到路由器内部。**控制面把转发规则写进表，数据面按表处理每个包。** [第 7 讲笔记]({{< relref "/notes/cs168-link-state-ip-addressing" >}}) · [第 8 讲官方课件](https://docs.google.com/presentation/d/1XmAVR1WizmgTzua_36Yq_YQRXI2m2eqOpejtu7XWTeI/htmlpresent)

## 1. 三个平面各管什么？

我原来的理解是数据面管发包，控制面管拓扑变化，管理面管配置和 Debug。把「管拓扑变化」说完整一点，就是**交换路由信息、选路，并把结果装入转发表**。网络稳定时，控制面仍可能发 Hello 或处理协议消息。

| 平面 | 做什么 | 课件中的机箱式路由器 |
| --- | --- | --- |
| 管理面 | 下配置、读计数器和告警 | 主控卡对接运维系统 |
| 控制面 | 运行路由协议、选路、下发转发表（FIB） | 主控卡计算，线卡接收并安装表项 |
| 数据面 | 按 FIB 逐包查表、改头、转发 | 线卡的转发芯片和内部交换结构 |

**Fabric（交换结构）负责在机箱内搬运包。** 当出口在另一块线卡时，入口线卡选好出口，Fabric 把包送过去。不同输入到不同输出可以并行，多个流争用同一输出时仍可能排队。主控下发表项或接收状态所走的通道取决于设备设计。[官方教材的机箱架构](https://textbook.cs168.io/routing/router.html#whats-inside-a-router)

## 2. 一个包从入口到出口

```text
入口 PHY / MAC → 解析包头 → 查询 FIB → 执行转发动作
→ 跨线卡时走 Fabric → 出口排队并发送
```

- **普通数据包**走转发快路径。PHY 接收信号，MAC 处理链路层帧。转发芯片根据目的 IP 查出口，执行改包头等动作。
- **路由协议包**交给控制面。例如发给本机的 OSPF 通告由相应协议处理。
- **Punt 流量**是需要额外处理的包。按课件举例，转发时遇到 TTL 耗尽，设备丢弃原包，可能上送 CPU 来生成 ICMP Time Exceeded。

IPv4 转发会递减 **TTL**，修改后更新 IPv4 首部校验和。TTL 耗尽会限制包在转发环路里能走的跳数，`traceroute` 则借助逐步增大的 TTL 探测各跳。这个 TTL 作用于单个包。第 6 讲的路由条目 TTL 管的是表项多久没更新就失效。[IPv4 路由器规范](https://www.rfc-editor.org/rfc/rfc1812.html#section-5.3.1) · [第 6 讲笔记]({{< relref "/notes/cs168-distance-vector-failures" >}})

遇到竞争时，**分类**决定进哪条队列，**缓存管理**决定该不该丢包，**调度**决定接下来发哪个包。课件的简化例子不区分流，满队列丢新来的包（tail drop），按到达顺序发（FIFO）。[官方课件第 26–31 页](https://docs.google.com/presentation/d/1XmAVR1WizmgTzua_36Yq_YQRXI2m2eqOpejtu7XWTeI/htmlpresent)

## 3. Lookup 为什么比改 TTL 难？

改 TTL 是每个包上固定的字段操作。**查表要从大量可更新、可能互相重叠的前缀里选一个结果，而且入口每来一个包就查一次。**

如果每个目的地址单独一条，查找只需做精确匹配。代价是一个 `/24` 就要展开成 256 个地址条目，改这条路由也得更新对应的明细。保留前缀能省空间，也把问题变成**最长前缀匹配（LPM）**。课件第 34 页的头两行分别固定了 `8 + 8 + 3 = 19` 位和 `8 + 5 = 13` 位，都匹配时选 `/19` 的端口 5。默认路由 `0.0.0.0/0` 在没有更长匹配时兜底。[官方课件第 33–35 页](https://docs.google.com/presentation/d/1XmAVR1WizmgTzua_36Yq_YQRXI2m2eqOpejtu7XWTeI/htmlpresent)

## 4. Trie 和最长前缀匹配是什么关系？

**LPM 规定选谁，Trie 决定怎么找。** 逐条扫描也能做 LPM，只需按每条前缀的长度比较相关比特。Trie 的收益是**共享前缀，沿目的地址只走一条分支**，省掉逐条扫描。

从根按目的 IP 的比特向下走。遇到存了路由的节点就更新「目前最佳」，走不下去时返回**最后命中的路由节点**。课件用字母举例，查 `sample` 时先记下 `sa`，再记下 `sam`。下一位是 `p`，而 `sam` 下只有 `e`，所以返回 `sam` 对应的端口 8。`sap` 在 `sa` 的另一条分支。

二叉 Trie 每走一层读一位，最坏走过 32 条边（IPv4），步数随地址位宽变化。真实查找延迟还会受内存访问影响。根节点可存 `/0`，一路没遇到更具体的表项时就用它。[官方课件第 36–41 页](https://docs.google.com/presentation/d/1XmAVR1WizmgTzua_36Yq_YQRXI2m2eqOpejtu7XWTeI/htmlpresent)

## 回看时先问自己

1. 主控已经把 FIB 下发，普通包跨线卡要经过谁？**入口线卡查表，Fabric 搬运，出口线卡发送。**
2. Trie 最后走到的节点没存路由，怎么选？**返回此前最后一个存有匹配路由的节点。**
3. 迁移到驱动、BSP 或中间件设计时看什么？**先画出状态如何下发、每包或每消息的高频路径、异常交给谁，以及哪个队列可能把延迟拖长。**
