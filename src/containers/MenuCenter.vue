<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAppStore } from '../stores/appStore';
import Changelog from './MenuCenter/Changelog.vue';
import DownloadPanel from './MenuCenter/DownloadPanel.vue';
import SponsorPanel from './MenuCenter/SponsorPanel.vue';
import Terms from './MenuCenter/Terms.vue';
import IconSidebarUpdate from '../assets/menuCenter/update2.svg?component';
import IconSidebarDownload from '../assets/menuCenter/download.svg?component';
import IconSidebarSponsor from '../assets/menuCenter/sponsor.svg?component';
import IconSidebarTerm from '../assets/menuCenter/term.svg?component';

const appStore = useAppStore();

const sidebarIcons = [IconSidebarUpdate, IconSidebarDownload, IconSidebarSponsor, IconSidebarTerm];
const sidebarTexts = ['更新说明', '下载地址', '支持作者', '使用条款'];
const sidebarColors = computed(() => 
	appStore.colorTheme === 'themeLight'
		? ['hwb(20 20% 0%)', 'hwb(120 0% 20%)', 'hwb(315 0% 0%)', 'hwb(35 10% 10%)']
		: ['hwb(20 5% 5%)', 'hwb(120 0% 15%)', 'hwb(315 20% 5%)', 'hwb(35 10% 20%)']
);
const animationName = ref('animationUp');

const menuCenterPadStyle = computed(() => {
	if (appStore.showMenuCenter === 0) {
		return {
			top: '8px',
			left: '8px',
			width: '76px',
			height: '28px',
			background: 'linear-gradient(to bottom, hwb(var(--bg97)), hwb(var(--bg95)))',
			opacity: '0',
			transitionDelay: '0s, 0s, 0s, 0s, 0.2s',
		}
	} else if (appStore.showMenuCenter === 1) {
		return {
			top: '8px',
			left: '8px',
			width: '440px',
			height: '28px',
			background: 'hwb(var(--bg98))',
			opacity: 1,
		}
	} else {
		return {
			top: '0',
			left: '0',
			width: '100%',
			height: '100%',
			background: 'linear-gradient(to bottom, hwb(var(--bg97)), hwb(var(--bg95)))',
			opacity: 1,
		}
	}
});
const menuCenterContainerStyle = computed(() => {
	if (appStore.showMenuCenter === 0) {
		return {
			width: '84px',
			height: '36px',
		}
	} else if (appStore.showMenuCenter === 1) {
		return {
			width: '448px',
			height: '36px',
		}
	} else {
		return {
			width: '100%',
			height: '100%',
			opacity: 1,
		}
	}
})

const getButtonColorStyle = (index: number) => ({ color: appStore.selectedPanelIndex === index ? sidebarColors.value[index] : 'hwb(0 50% 50%)' });

const handleBigIconClick = () => {
	if (appStore.showMenuCenter === 0) {
		appStore.showMenuCenter = 2;
	} else {
		appStore.showMenuCenter = 0;
	}
}

const handleParaButtonClicked = (index: number) => {
	animationName.value = index < appStore.selectedPanelIndex ? 'animationUp' : 'animationDown';
	appStore.selectedPanelIndex = index;
}

onMounted(() => appStore.selectedPanelIndex = 0);

</script>

<template>
    <div class="bigicon" @click="handleBigIconClick" ref="bigIconRef">
		<img src="/src/assets/icon_256_transparent.png" />
	</div>
	<div class="pad" :style="menuCenterPadStyle">
	</div>
	<div class="container" :style="menuCenterContainerStyle">
		<div class="lrCenter">
			<div>
				<div class="selectors">
					<button v-for="index in [0, 1, 2, 3]" :key="index" :aria-label="sidebarTexts[index]" @click="handleParaButtonClicked(index)">
						<component :is="sidebarIcons[index]" :style="getButtonColorStyle(index)" />
						<span :style="getButtonColorStyle(index)">{{ sidebarTexts[index] }}</span>
					</button>
				</div>
				<div class="content">
					<Transition :name="animationName">
						<Changelog v-if="appStore.selectedPanelIndex === 0" />
					</Transition>
					<Transition :name="animationName">
						<DownloadPanel v-if="appStore.selectedPanelIndex === 1" />
					</Transition>
					<Transition :name="animationName">
						<SponsorPanel v-if="appStore.selectedPanelIndex === 2" />
					</Transition>
					<Transition :name="animationName">
						<Terms v-if="appStore.selectedPanelIndex === 3" />
					</Transition>
				</div>
			</div>
		</div>
		<h1 class="title">{{ sidebarTexts[appStore.selectedPanelIndex] }}</h1>
	</div>
</template>

<style scoped lang="less">
	.bigicon {
		position: absolute;
		top: 8px;
		left: 8px;
		width: 76px;
		height: 76px;
		background-color: hwb(0.0 98% 2%);
		border-radius: 8px;
		box-shadow: 0 2px 6px hwb(0 0% 100% / 0.2);
		transition: all 0.3s ease, box-shadow 0s, transform 0s;
		z-index: 3;
		cursor: pointer;
		-webkit-app-region: none;
		img {
			width: 100%;
			height: 100%;
			pointer-events: none;
		}
		&:active {
			box-shadow: 0 0 2px 1px hwb(0deg 0% 100% / 0.1), 0 3px 6px hwb(0deg 0% 100% / 10%) inset;
			transform: translateY(0.5px);
		}
	}
	.pad {
		position: absolute;
		border-radius: 8px;
		box-shadow: 0 2px 8px hwb(0 10% 90% / 0.2);
		overflow: hidden;
		z-index: 2;
		transition: left 0.5s cubic-bezier(0.1, 1.2, 0.5, 1),
					top 0.5s cubic-bezier(0.1, 1.2, 0.5, 1),
					width 0.5s cubic-bezier(0.1, 1.2, 0.5, 1),
					height 0.5s cubic-bezier(0.1, 1.2, 0.5, 1),
					opacity 0.15s linear;
					background: 0.15s;
	}
	.container {
		position: absolute;
		left: 0;
		top: 0;
		overflow: hidden;
		z-index: 2;
		overflow: hidden;
		transition: all 0.5s cubic-bezier(0.1, 1.2, 0.5, 1);
		-webkit-app-region: none;
	}
	// 切换动画（向上）
	.animationUp-enter-from {
		/* z-index: 0; */
		opacity: 0;
		transform: translateY(-30px);
	}
	.animationUp-enter-active, .animationUp-leave-active {
		transition: opacity 0.3s, transform 0.5s cubic-bezier(0.2, 1.25, 0.3, 1);
	}
	.animationUp-enter-to, .animationUp-leave-from {
		/* z-index: 1; */
		opacity: 1;
		transform: translateY(0);
	}
	.animationUp-leave-active {
		transition: opacity 0.3s, transform 0.3s cubic-bezier(0.5, 0, 1, 1);
	}
	.animationUp-leave-to {
		opacity: 0;
		transform: translateY(30px);
	}
	// 切换动画（向下）
	.animationDown-enter-from {
		/* z-index: 0; */
		opacity: 0;
		transform: translateY(30px);
	}
	.animationDown-enter-active, .animationDown-leave-active {
		transition: opacity 0.3s, transform 0.5s cubic-bezier(0.2, 1.25, 0.3, 1);
	}
	.animationDown-enter-to, .animationDown-leave-from {
		/* z-index: 1; */
		opacity: 1;
		transform: translateY(0);
	}
	.animationDown-leave-active {
		transition: opacity 0.3s, transform 0.3s cubic-bezier(0.5, 0, 1, 1);
	}
	.animationDown-leave-to {
		opacity: 0;
		transform: translateY(-30px);
	}
	.lrCenter {
		position: absolute;
		top: 96px;
		left: 0;
		right: 0;
		// left: calc(15% - 80px);
		// right: calc(15% - 80px);
		bottom: 0px;
		display: flex;
		justify-content: center;
		margin: auto;
		&>div {
			position: relative;
			width: calc(70% + 160px);
			flex: 0 0 auto;
			.selectors {
				position: absolute;
				left: 0;
				top: 0;
				bottom: 0;
				width: 128px;
				padding: 4px 4px;
				overflow: auto;
				box-shadow: 0.5px 0.5px 1px 0px hwb(var(--hoverLightBg) / 0.95),
							20px 20px 20px 0px hwb(var(--hoverShadow) / 0.02),
							6px 6px 6px 0px hwb(var(--hoverShadow) / 0.02);
				// box-shadow: 12px 0 12px -12px hwb(0 50% 50% / 1);
				button {
					text-align: center;
					width: 120px;
					height: 40px;
					padding: 0;
					background-color: transparent;
					border: none;
					border-radius: 8px;
					transition: width 0.3s ease;
					&:hover {
						background-color: hwb(var(--hoverLightBg) / 0.4);
						// box-shadow: 0px 2px 2px rgba(127,127,127,0.5);
						// box-shadow: 0 0 4px 2px hwb(0 0% 100% / 0.05);
						box-shadow: 0 0 1px 0.5px hwb(var(--hoverLightBg)),
									0 1.5px 4px 0 hwb(var(--hoverShadow) / 0.15),
									0 1px 0.5px 0px hwb(var(--hoverLightBg)) inset;	// 上高光
					}
					&:active {
						background-color: transparent;
						box-shadow: 0 0 2px 1px hwb(var(--hoverShadow) / 0.05), // 外部阴影
									0 6px 12px hwb(var(--hoverShadow) / 0.1) inset; // 内部凹陷阴影
						transform: translateY(0.25px);
					}
					svg {
						width: 24px;
						height: 24px;
						margin: 0 2px 0 4px;
						vertical-align: middle;
						filter: var(--paraBoxButtonDropFilterSvg);
					}
					span {
						display: inline-block;
						width: 80px;
						vertical-align: -4.5px;
						padding-left: 4px;
						letter-spacing: 2px;
						white-space: nowrap;
						overflow: hidden;
						transition: width 0.3s ease, padding 0.3s ease;
						filter: var(--paraBoxButtonDropFilterSvg);
					}
					// @media only screen and (max-width: 600px) {
					// 	width: 50px;
					// 	span {
					// 		// display: none;
					// 		width: 0px;
					// 		padding: 0px;
					// 	}
					// }
				}
			}
			.content {
				position: absolute;
				left: 144px;
				right: 0;
				top: 0;
				bottom: 0;
				&>* {
					position: absolute;
					width: 100%;
					height: 100%;
					overflow: auto;
					&::-webkit-scrollbar {
						width: 10px;
						background: transparent;
					}
					&::-webkit-scrollbar-thumb {
						border-radius: 10px;
						background: rgba(128, 128, 128, 0.2);
					}
					&::-webkit-scrollbar-track {
						border-radius: 10px;
						background: rgba(128, 128, 128, 0.1);
					}
				}
			}
		}
	}
	.title {
		position: absolute;
		top: 32px;
		left: calc(15% - 80px + 144px);
		right: calc(15% - 80px);
		font-size: 22px;
		text-align: center;
		color: var(--titleText);
	}

</style>