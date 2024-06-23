<script setup lang="ts">
import { h } from 'vue';
import { useAppStore } from '../../stores/appStore';
import Button, { ButtonType } from '../../components/Button/Button';
import Popup from '../../components/Popup/Popup';
import Msgbox from '../../components/Msgbox/Msgbox';
import IconNodejs from '../../assets/menuCenter/downloadPanel/nodejs.svg?component';
import IconMsi from '../../assets/menuCenter/downloadPanel/msi.svg?component';
import IconApp from '../../assets/menuCenter/downloadPanel/app.svg?component';
import IconWeb from '../../assets/menuCenter/downloadPanel/web.svg?component';
import IconZip from '../../assets/menuCenter/downloadPanel/zip.svg?component';
import IconPointOut from '../../assets/warnings/pointOut.svg?component';

const appStore = useAppStore();

const handleDownloadClick = (os: 'Windows' | 'MacOS' | 'Linux' | 'web', selection: 0 | 1 | 2) => {
	if (!appStore.termsAgreed) {
		Popup({
			message: '请先同意条款后再来下载～',
		});
		appStore.selectedPanelIndex = 3;
		return;
	}
	let url;
	switch (os) {
		case 'Windows':
			url = [
				'https://github.com/ttqftech/FFBox/releases/download/v4.1/Windows_x86-64_FFBox_4.1.msi',
				'https://github.com/ttqftech/FFBox/releases/download/v4.1/Windows_x86-64_FFBoxService_4.1.exe',
			][selection];
			window.open(url, '__blank');
			break;
		case 'MacOS':
			url = [
				'https://github.com/ttqftech/FFBox/releases/download/v4.1/macOS_ARM64_FFBox_4.1.dmg',
				'https://github.com/ttqftech/FFBox/releases/download/v4.1/macOS_ARM64_FFBoxService_4.1',
			][selection];
			window.open(url, '__blank');
			break;
		case 'Linux':
			url = [
				'https://github.com/ttqftech/FFBox/releases/download/v4.1/Linux_x86-64_FFBox_4.1.deb',
				'https://github.com/ttqftech/FFBox/releases/download/v4.1/Linux_x86-64_FFBox_4.1.AppImage',
				'https://github.com/ttqftech/FFBox/releases/download/v4.1/Linux_x86-64_FFBoxService_4.1',
			][selection];
			window.open(url, '__blank');
			break;
		case 'web':
			url = [
				'./online',
				'./FFBox_v4.1_web.zip',
			][selection];
			if (selection === 0) {
				Msgbox({
					image: h(IconPointOut),
					title: '您将要使用一个尚未完善的网页版～',
					content: h('div', ['4.1 版本尚未对网页运行进行针对性优化，因此网页版只能用于体验功能，可能无法正常使用', h('br'), '同时，建议自行部署以获得更佳体验～']),
					buttons: [
						{ text: `我已知悉，继续`, type: ButtonType.Primary, callback: () => window.open(url, '__blank') && true },
					]
				});
			} else {
				window.open(url, '__blank');
			}
			break;
		default:
			break;
	}
};

</script>

<template>
	<div class="downloadPanel">
		<h2>Windows<span>(x86-64)</span></h2>
		<Button size="large" @click="handleDownloadClick('Windows', 0)"><IconMsi />msi 完整安装包</Button>
		<Button size="large" @click="handleDownloadClick('Windows', 1)"><IconNodejs />转码服务</Button>
		<h2>Linux<span>(x86-64)</span></h2>
		<Button size="large" @click="handleDownloadClick('Linux', 0)"><IconMsi />deb 完整安装包</Button>
		<Button size="large" @click="handleDownloadClick('Linux', 1)"><IconApp />AppImage 便携程式</Button>
		<Button size="large" @click="handleDownloadClick('Linux', 2)"><IconNodejs />转码服务</Button>
		<h2>MacOS<span>(ARM64)</span></h2>
		<Button size="large" @click="handleDownloadClick('MacOS', 0)"><IconApp />app 应用程式</Button>
		<Button size="large" @click="handleDownloadClick('MacOS', 1)"><IconNodejs />转码服务</Button>
		<h2>网页<span>(不提供转码服务)</span></h2>
		<Button size="large" @click="handleDownloadClick('web', 0)"><IconWeb />在线使用</Button>
		<Button size="large" @click="handleDownloadClick('web', 1)"><IconZip />zip 自行部署</Button>
		<h2>Android</h2>
		<p>暂未有本地运行开发计划</p>
		<h2>iOS</h2>
		<p>暂未有本地运行开发计划</p>
	</div>
</template>

<style scoped lang="less">
	.downloadPanel {
		padding: 0 5%;
		font-size: 14px;
		// overflow: auto;
		// font-family: "苹方 中等", "PingFang SC", 苹方, 微软雅黑, "Segoe UI", Consolas, Avenir, Arial, Helvetica, sans-serif, 黑体;
		font-weight: 500;
		text-align: left;
		p {
			margin-bottom: 4px;
		}
		span {
			font-size: 0.5em;
			opacity: 0.5;
			margin-left: 1em;
		}
		button {
			letter-spacing: 0px;
			&>svg {
				width: 20px;
				height: 20px;
				vertical-align: -4px;
				margin-right: 6px;
			}
		}
	}
</style>