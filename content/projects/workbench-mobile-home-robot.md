---
title: "移动机器人 Linux CAN 通信与故障验证平台"
description: "参与 wbcan 虚拟 CAN 驱动开发，围绕故障注入、skb 生命周期、发送背压及 bus-off 恢复整理实践。"
summary: "团队项目中的 Linux 驱动开发实践：通过 SocketCAN 连接内核故障测试设备与上层运行时，梳理通信异常及恢复机制。"
status: "团队项目 · Linux 驱动开发"
stack: ["Linux 内核", "C", "SocketCAN", "ROS 2"]
weight: 1
hideMeta: true
ShowToc: true
ShowPostNavLinks: false
---

[项目源仓库 ↗](https://github.com/Quchaosheng/workbench-mobile-home-robot) · [驱动知识总结 →]({{< relref "/notes/wbcan-linux-driver/index.md" >}})

## 项目背景

Workbench 是移动家庭机器人项目，涵盖任务运行时、设备通信、状态诊断及事件验证等模块。我在项目中担任 **Linux 驱动开发者**，参与 wbcan 虚拟 CAN 内核驱动及通信故障验证相关工作。

wbcan 向用户态提供标准 SocketCAN 接口，并通过可配置故障构造异常场景，让上层协议与运行时能够检查错误处理、超时和恢复行为。

## 我参与的工作

- **驱动开发**：围绕网络设备注册、接口启停、帧发送与本地回环，参与 wbcan 用户态通信测试环境的建设。
- **故障注入**：通过 debugfs 配置丢帧、载荷位翻转、bus-off 和发送背压等场景，使通信异常可以按条件复现。
- **状态与资源管理**：跟踪发送、停机和恢复路径，梳理 skb 所有权、TX 队列控制及共享状态同步，结合网络统计与驱动快照分析异常。
- **跨层诊断**：沿驱动、SocketCAN、设备运行时和 ROS 2 状态发布链路，区分帧交付、协议 ACK 与业务完成，分析超时重试、STOP 抢占和恢复过程。

## 从项目里整理出的知识

最值得持续积累的是三条线索：

1. **数据归谁管理**：`NETDEV_TX_OK` 与 `NETDEV_TX_BUSY` 对应不同的 skb 所有权，回环与位翻转又涉及共享数据和独立副本。
2. **状态何时允许推进**：发送队列的停止与唤醒要与设备状态、资源可用性一致；bus-off 恢复还需要与停机路径同步。
3. **每层结果证明什么**：驱动接受帧、协议确认、ROS 2 任务终态与真实动作完成，需要分别理解和观察。

完整笔记按 SocketCAN 分层、生命周期、skb、背压、恢复、并发、故障注入和跨层诊断展开，关联具体源码入口，方便后续复习与继续实践。

**[阅读《wbcan 驱动实践总结》 →]({{< relref "/notes/wbcan-linux-driver/index.md" >}})**

## 源码与验证范围

完整工程维护于 [Quchaosheng/workbench-mobile-home-robot](https://github.com/Quchaosheng/workbench-mobile-home-robot)，驱动入口位于 [`kernel/wbcan/`](https://github.com/Quchaosheng/workbench-mobile-home-robot/tree/main/kernel/wbcan)。本页介绍我参与的驱动工作，团队完整项目以源仓库说明为准。

wbcan 用于软件层的通信与故障测试。真实 CAN 控制器的 IRQ、DMA、总线时序与硬件吞吐、延迟，需要结合目标板和控制器单独验证。
