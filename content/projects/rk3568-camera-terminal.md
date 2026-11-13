---
title: "RK3568 视频采集与调试工具"
description: "基于 C++17 与 V4L2 的嵌入式视频采集工具，实现 NV12 抓拍、有界队列、运行统计与多轮会话管理。"
summary: "在 RK3568 + OV5695 上完成用户态采集工具，归档源码、构建步骤与 10000 帧快速验收记录。"
status: "V1.0 · 用户态核心版"
stack: ["RK3568", "C++17", "V4L2", "Linux"]
weight: 0
hideMeta: true
ShowToc: true
ShowPostNavLinks: false
---

[查看 GitHub 源码 →](https://github.com/gulu-123/rk3568-camera-terminal) · [构建与部署](https://github.com/gulu-123/rk3568-camera-terminal/blob/main/docs/build-and-deploy.md) · [验收报告](https://github.com/gulu-123/rk3568-camera-terminal/blob/main/docs/test-report.md)

## 项目做了什么

这是我在讯为 RK3568 开发板上完成的 C++17 用户态视频采集与调试工具。系统采用 Buildroot、Linux 4.19.232，摄像头为 OV5695，通过 V4L2 multi-planar API 采集单 plane NV12 图像。

围绕“稳定取帧、及时归还驱动缓冲区、让慢处理可观测、退出后能够再次采集”，实现了以下功能：

- **图像采集与抓拍**：协商采集格式，保存 NV12 原始帧及尺寸、stride、色彩信息等元数据。
- **有界队列与处理线程**：队列容量为 3，满时丢弃最旧待处理帧，记录主动丢弃和队列水位。
- **运行统计**：区分驱动错误帧、序号缺口、应用队列丢帧和处理帧数。
- **资源管理与退出**：使用 RAII 管理 fd、mmap 和数据流，支持 SIGINT / SIGTERM 协作退出，以及同一进程、同一 fd 上的重复会话。

## 采集与处理如何协作

```text
采集主线程：poll → DQBUF → 校验 → 复制像素 → QBUF → 入队
处理线程：  出队 → 可选模拟延时 → 保存抓拍 / 消费图像
```

应用帧拥有自己的像素内存，驱动缓冲区归还后，处理线程仍可安全访问图像。当前实现使用一次像素复制和逐帧分配。退出时停止数据流，关闭并排空队列，等待工作线程，再解除映射和释放驱动 buffer。

[设计与代码阅读 →](https://github.com/gulu-123/rk3568-camera-terminal/blob/main/docs/design.md)

## 已归档的板端结果

2026 年 10 月 16 日的快速验收采用 **640 × 480 NV12**，执行 `camera_info --frames 10000 --no-snapshot`：

| 指标 | 结果 |
| --- | ---: |
| 采集 / 处理帧数 | 10000 / 10000 |
| 采集耗时 | 332.845 秒 |
| 平均取帧速率 | 30.044 FPS |
| 错误标记帧 / 驱动序号缺口 / 队列丢帧 | 0 / 0 / 0 |
| RSS（34 个采样点） | 5300 kB |
| 线程数 / fd 数（采样值） | 2 / 4 |

以上结果来自源码包附带的 [capture.log](https://github.com/gulu-123/rk3568-camera-terminal/blob/main/evidence/acceptance/20261016_quick/capture.log) 与 [resources.csv](https://github.com/gulu-123/rk3568-camera-terminal/blob/main/evidence/acceptance/20261016_quick/resources.csv)。这轮验收约 5 分 33 秒，采样资源保持稳定；两小时完整模式尚未执行。

验收报告还记录了慢消费者丢帧、同进程同 fd 50 轮启停、信号退出和文件写入失败后的恢复验证；各项证据类型和归档情况见仓库报告。

## 获取与运行

```bash
git clone https://github.com/gulu-123/rk3568-camera-terminal.git
cd rk3568-camera-terminal
bash build.sh
scp camera_info root@开发板IP:/tmp/
```

构建需要在 Ubuntu 上准备配套的 Rockchip GCC 9.3.0 交叉工具链及宿主依赖，具体路径和环境覆盖方式见[构建文档](https://github.com/gulu-123/rk3568-camera-terminal/blob/main/docs/build-and-deploy.md)。开发板上可运行：

```bash
/tmp/camera_info --frames 120 --output /tmp/frame.nv12
/tmp/camera_info --frames 120 --no-snapshot --process-delay-ms 100
/tmp/camera_info --cycles 50 --frames 30 --no-snapshot
```

## 当前版本与后续方向

V1.0 完成用户态采集核心。摄像头与 ISP 内核驱动沿用厂商实现；独立内核构建、驱动补丁、Qt 界面、编码、网络推流和 ROS 集成作为后续方向继续推进。
