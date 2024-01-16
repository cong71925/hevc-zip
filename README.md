# hevc-zip

一个使用HEVC或AV1编码进行图像有损压缩的程序，基于Ffmpeg + Electron + Vue

![GitHub package.json version (branch)](https://img.shields.io/github/package-json/v/cong71925/hevc-zip/main)
![GitHub all releases](https://img.shields.io/github/downloads/cong71925/hevc-zip/total)
![GitHub License](https://img.shields.io/github/license/cong71925/hevc-zip)

## 软件界面
![interface](https://github.com/cong71925/hevc-zip/assets/42642310/4341d7f3-67d2-493c-b1e3-61595a812a27)

## 下载发行版
[Releases](https://github.com/cong71925/hevc-zip/releases)

## 使用说明
- 目前仅支持jpg和png和webp格式的图像
- hevc和av1都是是有损编码，解压后的图像不等价于原图像
- 被压缩的图像尽量选分辨率与格式一致的，以达到最佳效果
- 强制解压为webp格式会较为耗时，webp格式是基于VP8编码的，编码相对复杂和耗时
- jpg格式的图像会多经历一次有损编码，原因是jpg本身即是有损编码格式，从视频中提取图像再保存为jpg会再经历一次信息丢失
- 使用硬件编码时请确认使用环境有对应硬件及其编码器，否则可能导致压缩失败
- 硬件编码器在进行分辨率非常大的图像编码时可能会出现错误，如4K、8K以上，如果压缩失败，请禁用硬件编码使用软件编码器
- 由于Ffmpeg的限制，即使是使用软件编码器的情况下，在进行像素点超过2 ^ 31 / 8 - 1，约为16384 * 16384的图像编码时会出现错误
## 压缩效率
使用源文件为807.76mb的CG集，图片格式均为jpg，编码等级=5，使用软件编码器进行测试:
|编码格式|crf=5|crf=10|crf=15|crf=20|
|----|----|----|----|----|
|hevc|183.81mb, 22.76%|164.81mb, 20.40%|127.40mb, 15.77%|91.51mb, 11.58%|
|av1|91.91mb, 11.38%|65.77mb, 8.14%|51.03mb, 6.32%|41.47mb, 5.13%|

av1软件编码器与hevc软件编码器在相同crf的清晰度并不一致，上述表格仅供参考
## 实现原理
1. 遍历待压缩的图像，按照不同的分辨率，格式，位深等分成不同的视频轨道，并将原文件的相对路径，文件名，分轨信息等写入index.json中
2. 调用Ffmpeg依次对视频轨道使用h.265编码
3. 将编码好的各视频轨道与index.json使用mkv封装

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin)

## Project Setup

### Install

```bash
$ pnpm install
```

### Development

```bash
$ pnpm dev
```

### Build

```bash
# For windows
$ pnpm build:win

```
## LICENSE

[GPLv3](LICENSE)
