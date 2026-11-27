---
title: "CS537 File API：文件名删了，为什么还能读？"
slug: cs537-file-api
date: 2026-11-27
categories: ["操作系统"]
tags: ["CS537", "持久化", "文件系统", "File API"]
summary: "从 /etc/bashrc 的路径查找出发，区分 inode、打开文件描述与 FD，再理解 lseek、硬链接、unlink 和持久化替换。"
description: "CS537 Fall 2019 · File API 学习笔记"
draft: false
---

前两篇跟着 I/O 走到设备，再看 RAID 怎么提供逻辑块。这一讲往上一层，看程序怎么找到文件、怎么保留一次打开的状态，以及怎么要求文件系统把更新持久化。最容易串起来的例子是：**一个文件已经没有名字了，手上的 FD 为什么还能用？** [I/O 设备笔记](../cs537-io-devices/) · [RAID 笔记](../cs537-raid/)

## 1. /etc/bashrc 的名字存在哪？

查找从根目录开始。先在根目录的条目里用 `etc` 找到目录的 inode，再到这个目录里用 `bashrc` 找到目标 inode。目录项负责**名字 → inode 号**，inode 记录文件类型、权限、长度和如何定位数据。目录自己也有 inode，因为它的条目同样需要存储。

课件把多个对象画进一张 inode 表，是在表达它们可以属于同一个文件系统的 inode 编号空间。以 ext4 为例，实际的 inode 表按块组存放。inode 号也只在单个文件系统内标识对象，跨文件系统核对身份时，可同时看 `st_dev` 和 `st_ino`。 [OSTEP 第 39 章](https://pages.cs.wisc.edu/~remzi/OSTEP/file-intro.pdf) · [ext4 inode 文档](https://docs.kernel.org/filesystems/ext4/inodes.html)

## 2. lseek 改的偏移量归谁？

`open(path, flags)` 解析路径，并返回当前进程最小的可用 FD。用 `O_CREAT` 时还要传创建权限 `mode`。后续读写走 **进程 FD 表 → 打开文件描述 → 文件对象**，省去重新解析路径。**文件偏移量属于打开文件描述**，因此两个 FD 是否共享偏移，取决于它们引用哪一项。 [Linux open(2)](https://man7.org/linux/man-pages/man2/open.2.html)

| 怎样得到第二个 FD | 偏移量怎样变化 |
| --- | --- |
| 独立 `open()` 同一个普通文件 | 两次打开各有自己的偏移 |
| `dup(fd)` 或 `fork()` 后继承 FD | 引用同一打开文件描述，一边读完，另一边从新位置接着读 |

`read()` 和 `write()` 按实际传输的字节数推进偏移。`lseek(fd, n, whence)` 改的是接下来读写的逻辑位置，`SEEK_SET` 从开头算，`SEEK_CUR` 从当前位置算，`SEEK_END` 从末尾算。比如 A、B 由 `dup()` 共享一个打开文件描述。A 读到字节 100 的位置后，B 执行 `lseek(B, -20, SEEK_CUR)`，下一次用 A 读取也会从 80 开始。把偏移设到文件末尾之外只改变位置，随后在那里成功写入才会延长文件。 [Linux lseek(2)](https://man7.org/linux/man-pages/man2/lseek.2.html)

## 3. 硬链接、软链接与打开引用

| 操作 | 实际改动 |
| --- | --- |
| `ln a b` | 增加一个目录项，`a` 和 `b` 指向同一 inode，目标的硬链接数加一 |
| `ln -s a s` | 创建一个独立的符号链接对象，内容是路径 `a`。相对目标从链接所在目录解析，目标的硬链接数不变 |
| `unlink("a")` | 移除 `a` 这个目录项，其他名字和已有 FD 还能访问原对象 |

假设 `a` 是唯一的硬链接，先以读写方式打开它，再执行 `unlink("a")`。此时通过路径重新打开会找不到，但旧 FD 仍可读写，等最后一个打开引用释放后才回收。要分开看两件事：**目录里有没有名字，内核还有没有引用**。符号链接保存路径，等到访问时再解析，目标路径失效时可以悬空。文件系统中的 `linking` 指建立名字引用，CS:APP 的链接指解析程序符号和重定位。 [Linux unlink(2)](https://man7.org/linux/man-pages/man2/unlink.2.html) · [Linux symlink(7)](https://man7.org/linux/man-pages/man7/symlink.7.html)

创建子目录时，子目录的 `..` 会引用父目录。所以在传统 Unix 目录模型中，一个普通目录通常有 `2 + 直接子目录数` 个硬链接，基础的 2 来自上级目录中的名字和自己的 `.`。具体文件系统可能有例外。日常用 `opendir()/readdir()` 遍历名字，用 `stat()` 或 `fstat()` 查元数据。挂载则把另一个文件系统的根接到某个路径，例如 `/mnt/data`，让同一棵目录树能跨文件系统查找。 [OSTEP 第 39 章](https://pages.cs.wisc.edu/~remzi/OSTEP/file-intro.pdf)

## 4. 原子替换与掉电持久性

普通缓冲写中，`write()` 成功时数据可以仍在页缓存。配置文件更新可以在同一目录内按这个顺序做，每步都检查结果：

1. 把新内容完整写入临时文件，处理短写。
2. 对临时文件执行 `fsync()`，同步新内容和相关元数据。
3. 用 `rename()` 原子替换目标名。通过目标路径新打开的读者会看到旧版或新版，已经打开旧文件的读者仍引用旧对象。
4. 对父目录的 FD 执行 `fsync()`，同步目录项的变动。

**文件的 fsync 管新内容，rename 管运行时的名字切换，目录的 fsync 管名字变动的持久化。** 这也是下一步读文件系统实现时值得追的地方：一次 API 调用需要更新哪些块，这些块以什么顺序写入？ [Linux rename(2)](https://man7.org/linux/man-pages/man2/rename.2.html) · [Linux fsync(2)](https://man7.org/linux/man-pages/man2/fsync.2.html)
