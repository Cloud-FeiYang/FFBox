<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Popup from '../components/Popup/Popup';
import { useAppStore } from '../stores/appStore';
import MenuCenter from './MenuCenter.vue';

const appStore = useAppStore();

const FFBoxZoomValue = ref(1);
const bigDownloadButtonZoomValue = ref(1);
const shrinkedHeight = ref(0);
const showBigDownloadButton = ref(false);

const FFBoxTopWrapperStyle = computed(() => {
	if (appStore.showMenuCenter) {
		return {
			top: `calc(50% - ${360 * FFBoxZoomValue.value}px + 8px)`, // firstScreen 高度是 100vh + 64 - 缩减高度，因此需要减掉 32px，再加上 topBar 挤占空间的一半 40px
		};
	} else {
		return {
			top: 'calc(0% + 480px)',
		};
	}
});
const FFBoxWrapperStyle = computed(() => {
	return {
		zoom: FFBoxZoomValue.value
	};
});
const firstScreenStyle = computed(() => {
	return {
		height: `calc(100vh + ${64 - shrinkedHeight.value}px)`
	};
});

const handleTopBarButtonClicked = (index: number) => {
	if (index === 0) {
		// 更新说明
		appStore.showMenuCenter = 2;
		appStore.selectedPanelIndex = 0;
	} else if (index === 1) {
		// 开发日志
		window.open('https://github.com/ttqftech/FFBox/blob/4.0%2B/日志.md', '_blank');
	} else if (index === 2) {
		// 使用条款
		appStore.showMenuCenter = 2;
		appStore.selectedPanelIndex = 3;
	} else if (index === 3) {
		// 网页版
		if (!appStore.termsAgreed) {
			Popup({
				message: '请先同意条款后再使用～',
			});
			appStore.showMenuCenter = 2;
			appStore.selectedPanelIndex = 3;
		} else {
			window.open('./online', '_blank');
		}
	} else if (index === 4) {
		// 下载
		appStore.showMenuCenter = 2;
		appStore.selectedPanelIndex = 1;
		showBigDownloadButton.value = false;
	}
};

onMounted(async () => {
	const sleep = (ms: number) => new Promise((r) => setTimeout(() => r, ms));

	// 窗口大小变更监听
	const listener = () => {
		if (document.body.clientWidth < 1080) {
			FFBoxZoomValue.value = document.body.clientWidth / 1080;
			const shrinkedWidth = 1080 - document.body.clientWidth;
			shrinkedHeight.value = shrinkedWidth / (1080 / 720) * 0.7; // 因为大约是在肚子的位置裁掉画面的，所以乘个 0.7
		}
		bigDownloadButtonZoomValue.value = document.body.clientWidth / window.innerHeight < 180 / 160 ? document.body.clientWidth / 180 * 0.8 : window.innerHeight / 160 * 0.8;
	}
	listener();
	window.addEventListener('resize', listener);

	// 浏览器检查
	if (navigator.userAgent.includes('Firefox')) {
		Popup({ message: 'Firefox 浏览器在浏览本页的时候，可能会出现部分元素缩放不正常的现象' });
		sleep(1);
		Popup({ message: '如影响到浏览，烦请更换 Chromium 内核的浏览器～' });
	}
	let zoomValue = 1;
	if (document.body.clientWidth < 1080) {
		zoomValue = document.body.clientWidth / 1080;
	}
	if (window.innerHeight < 720 * zoomValue + 40) {
		Popup({ message: '您的浏览器窗口高度较小，可能无法正确排版，请减小缩放以正确显示页面～' });
	}
})

</script>

<template>
	<div class="mainFrame" :data-color_theme="appStore.colorTheme">
		<div class="topBar lrMargin">
			<a class="nav" style="float: left;" href="http://www.ttqf.tech/" title="滔滔清风科技馆主页">
				<div class="ttqftechlogo"></div>
			</a>
			<a class="nav" style="float: right;" href="https://github.com/ttqftech/FFBox/" target="_blank" title="FFBox GitHub 主页">
				<svg height="40" width="40" viewBox="0 0 16 16" version="1.1" style="fill: #333;"><path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
			</a>
			<a class="nav" style="float: right;" href="https://gitee.com/ttqf/FFBox" target="_blank" title="FFBox Gitee 主页">
				<img height="40" width="40" src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNjI4Njk5NTExMTgyIiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjU1MSIgd2lkdGg9IjEyOCIgaGVpZ2h0PSIxMjgiIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj48ZGVmcz48c3R5bGUgdHlwZT0idGV4dC9jc3MiPjwvc3R5bGU+PC9kZWZzPjxwYXRoIGQ9Ik01MTIgMTAyNEMyMjkuMjQ4IDEwMjQgMCA3OTQuNzUyIDAgNTEyUzIyOS4yNDggMCA1MTIgMHM1MTIgMjI5LjI0OCA1MTIgNTEyLTIyOS4yNDggNTEyLTUxMiA1MTJ6IG0yNTkuMTY4LTU2OC44OTZoLTI5MC43NTJhMjUuMjggMjUuMjggMCAwIDAtMjUuMjggMjUuMjhsLTAuMDMyIDYzLjIzMmMwIDEzLjk1MiAxMS4yOTYgMjUuMjggMjUuMjggMjUuMjhoMTc3LjAyNGEyNS4yOCAyNS4yOCAwIDAgMSAyNS4yOCAyNS4yOHYxMi42NGE3NS44NCA3NS44NCAwIDAgMS03NS44NCA3NS44NGgtMjQwLjIyNGEyNS4yOCAyNS4yOCAwIDAgMS0yNS4yOC0yNS4yOHYtMjQwLjE5MmE3NS44NCA3NS44NCAwIDAgMSA3NS44NC03NS44NGgzNTMuOTJhMjUuMjggMjUuMjggMCAwIDAgMjUuMjgtMjUuMjhsMC4wNjQtNjMuMmEyNS4zMTIgMjUuMzEyIDAgMCAwLTI1LjI4LTI1LjMxMkg0MTcuMTg0YTE4OS42MzIgMTg5LjYzMiAwIDAgMC0xODkuNjMyIDE4OS42djM1My45NTJjMCAxMy45NTIgMTEuMzI4IDI1LjI4IDI1LjI4IDI1LjI4aDM3Mi45MjhhMTcwLjY1NiAxNzAuNjU2IDAgMCAwIDE3MC42NTYtMTcwLjY1NnYtMTQ1LjM3NmEyNS4yOCAyNS4yOCAwIDAgMC0yNS4yOC0yNS4yOHoiIHAtaWQ9IjU1MiIgZmlsbD0iI2Q5MDAxMyI+PC9wYXRoPjwvc3ZnPg==" alt="">
			</a>
		</div>
		<div class="firstScreen" :style="firstScreenStyle">
			<div class="lrCenter">
				<img class="title-1" src="../assets/软件图标v1.0.png" alt="FFBox 图标" width="368" height="184" />
				<div class="actions">
					<button @click="handleTopBarButtonClicked(0)">更新说明</button>
					<div class="seperator"></div>
					<button @click="handleTopBarButtonClicked(1)">开发日志</button>
					<div class="seperator"></div>
					<button @click="handleTopBarButtonClicked(2)">使用条款</button>
				</div>
			</div>
			<div class="FFBox-topWrapper" :style="FFBoxTopWrapperStyle">
				<div class="FFBox-wrapper" :style="FFBoxWrapperStyle">
					<img v-if="appStore.colorTheme === 'themeLight'" src="../assets/软件截图_浅色.png" />
					<img v-if="appStore.colorTheme === 'themeDark'" src="../assets/软件截图_深色.png" />
					<div class="FFBox">
						<button @click="handleTopBarButtonClicked(3)" class="startbutton startbutton2 startbutton-cyan">🌐网页版</button>
						<button @click="handleTopBarButtonClicked(4)" class="startbutton startbutton1 startbutton-green">⬇️下载</button>
						<MenuCenter />
					</div>
				</div>
			</div>
		</div>
		<div class="screen2">
			<div class="lrMargin">
				<div class="article">
					<h1><s>FAQ</s>（自问自答）</h1>
					<div style="height: 16px;"></div>
					<div class="faqbrick-wrapper">
						<section class="faqbrick">
							<h2 class="title">FFBox 跟其他转码软件有什么不同？</h2>
							<div class="content">
								<p>市面上大多数转码软件说白了就是个套壳 FFmpeg。咱这不一样，FFBox 它直接就是个壳，不给您赠送 FFmpeg。</p>
							</div>
						</section>
						<section class="faqbrick">
							<h2 class="title">[成龙挠头.jpg]，为什么不附带 FFmpeg？</h2>
							<div class="content">
								<p>你家电脑的外存为什么满得那么快？因为你下的转码软件十有八九都给您送了个 FFmpeg，下得越多，送得越多。</p>
								<p>这好吗？这不好。那咋解决呢？Linux 的做法就很合适——先找一下你的电脑有没有 FFmpeg，有就直接用，无就先装上再用。FFBox 也是同样的思路。</p>
								<p>再者，FFmpeg 与 FFBox 具有不同的 LICENSE，因此 FFBox 不包含 FFmpeg 代码的拷贝。并且为了偷懒，咱连二进制文件也不提供～</p>
							</div>
						</section>
						<section class="faqbrick">
							<h2 class="title">容器格式是啥？编码是啥？不会用怎么办？有教程吗？</h2>
							<div class="content">
								<p>如您所见，咱这软件连 FFmpeg 都不附带，显然就不是给新手用的呀～</p>
								<p>但是我是一定不希望放弃这部分用户的！在未来，FFBox 会推出“简易模式”，方便大家在无需过多了解视频参数的情况下轻松使用。</p>
							</div>
						</section>
						<section class="faqbrick">
							<h2 class="title">下载链接速度好慢？冒 404 了？</h2>
							<div class="content">
								<p>由于众所周知的原因，您可以将电脑搬到境外进行下载，这样下载速度会得到明显的提升。</p>
								<p><s>我也希望我的用户具有一定的逃脱“信息茧房”的能力 ⊂( *･ω･ )⊃</s></p>
							</div>
						</section>
						<section class="faqbrick">
							<h2 class="title">FFBox 的起名有什么含义吗？</h2>
							<div class="content">
								<p>FFBox is a box of FFmpeg. This is the most accurate explanation.</p>
								<p>And, think of what FFF... means. Not so popular? Consider which day is the initial release date of FFBox.</p>
								<p>It's strange that some people have stereotypes of programmers. Griddy T-shirts, treating computer as a companion, and so on what the fuck... That's really good programmers! If he isn't, he's nerd.</p>
								<p>If you know my previous avatar you may know I'm not really a programmer. Making things on computers is just for fun.</p>
								<p>Yeah. There's a lot of fun things to do. But as you know, the green hat had kill most of my interests or to say abilities.</p>
								<p>So what the fuck just do programming... My dream has been...?</p>
								<p>Haven't you watch <i>onestop</i>? <a href="https://www.bilibili.com/video/av968582548/" target="_blank">Go watch it. </a>Parts of it were transcoded by FFBox. Totally worth a seen.</p>
								<p><i>(2024/04/01 更新)</i> <s><strong>其实视频转码什么的功能已经不重要了。FFBox 的 LICENSE 才是我想要做的全部功能。</strong></s></p>
							</div>
						</section>
						<section class="faqbrick">
							<h2 class="title">FFBox 的中文名是“丹参盒”吗？</h2>
							<div class="content">
								<s>
									<p>众所周知，如果一款软件有首选的中文名，它就大概率是不好用的软件。加水印、DPI 不适配、功能简陋，等等都有。这就是为什么我要做 FFBox，但又不给它写中文名的原因。</p>
									<p>至于标题栏上写“丹参盒”，只是因为中文的方块字形在标题栏上搭配的视觉效果比英文更和谐而已。</p>
									<p>那么如何给它写一个临时的名字呢？结合问题“FFBox 的起名有什么含义吗？”你就能看懂这个名字的妙处。</p>
								</s>
								<p>啊！原来你还记得以前我用过这名字贴到标题栏上啊！太感谢你一直以来的关注了！(●'◡'●)ﾉ♡</p>
							</div>
						</section>
						<section class="faqbrick">
							<h2 class="title">为什么软件的体积这么大？</h2>
							<div class="content">
								<p>您使用的很多软件，比如带有首选中文名的浏览器、Visual Studio Code、飞书、QQ，甚至包括了破烂微信，它们其实都是套壳浏览器。由于技术原因，这一层套壳确实就没有办法像 FFmpeg 套壳那样避免，所以占主要体积的是浏览器。</p>
								<p>但是这个问题并非无法解决。FFBox <s>即将推出</s>远程转码管理功能，这将支持在浏览器上直接操作。</p>
								<p><strong>真的推出了！您快去用！</strong></p>
								<p>（啊，以后有空了去了解一下 webview2，毕竟我的思想其实也是尽量不要往用户的外存里放那么多份相同的东西……）</p>
							</div>
						</section>
						<section class="faqbrick">
							<h2 class="title">这些年来，FFBox 的版本更迭都经历了什么？</h2>
							<div class="content">
								<p>1.x 版本的 FFBox，是经典的“html + css + js”前端三件套，属于初出茅庐的作品，没有工程化和模块化，一个 js 文件两千多行，逻辑是分散的，直接操作 DOM，甚至无法正确处理 FFmpeg 的状态，因此出道即瓶颈，只经历了 1.1 一个可用性改善的版本就进入了 2.x 版本的开发。</p>
								<p>1.x 版本中途很长时间没更新，因为正在制作 <a href="https://www.bilibili.com/video/av968582548/" target="_blank">onestop</a>。</p>
								<p>2.x 版本是使用 vue 2 进行工程化、模块化开发的重构作品。其模块化程度相对 1.x 版本是一个飞跃，但仍处于相当糟糕的阶段。大量控制逻辑集中在状态管理器上，总线上挤满了逻辑，相当于过度中心化的同心圆城市结构，组件分离但不独立。处于能正常开发，但走不太远的状态。因此在此处累积了 7 个版本，才进入 3.x 版本的开发。</p>
								<p>2.x 版本中途由于去了<s>著名的</s>厂工作，所以更新被搁置。不过同时也积累了在 macOS 方面的经验，使其能在 macOS 上运行，当然也吸纳了更优秀的模块化开发经验。</p>
								<p>3.x 版本分离了转码服务和 UI，即支持远程转码。改用了更佳的模块化方案，使不少组件得到独立。同时加入了 TypeScript，提供了更优秀的开发环境。但其使用的技术框架依然较旧，而且转码服务必须依托 FFBox 主进程运行，并且依然有较大量的逻辑集中在单个文件中进行，因此算是一个过渡版本。另外，此时的软件 UI 布局也已经不太支持加入太多新功能，也存在一些并不是那么好用的地方。它更有必要根据进行一次翻新改造。因此，3.0 版本刚做好，便进入 4.0 版本的开发了。</p>
								<p>3.x 版本经历了我人生的几个事件——毕业、找工作、被工作折磨。这些事件都导致了我在几个月的时间里都没有动过 FFBox 的代码。幸好，我心中仍怀有着持续完善这个软件，让它代表我的技术进步的想法。因此，它历经一年半，总算是开发完成了。</p>
								<p>4.x 版本使用了最现代的技术架构——vue 3、vite、less，靠纯自行编写实现了整个项目的开发与打包脚本，同时也彻底分离了前后端，也尝试了一些像 DirectX 那样的新奇玩意。界面上也结合了我多年以来对功能性、易用性、美观性的理解，融合了各家的习惯，设计了全新的 UI。虽然没有太多实质功能性上的更新，但各处都有不小的改变。可以说整个研发周期内是踩坑不断。我也使用了日志的形式将这些经验积累了起来，可以说它甚至比软件本身能做到的事情更为重要。它记录了我的踩坑经历、事件感慨、人生感悟……无需多言，这款软件，主打好看实用，您用便是！无需理会日志这种无人知晓的内容~</p>
							</div>
						</section>
						<section class="faqbrick">
							<h2 class="title">有考虑过加入暗色模式吗？</h2>
							<div class="content">
								<p style="font-size: 1.2em">开发好了！</p>
							</div>
						</section>
						<section class="faqbrick">
							<h2 class="title">“滤镜”模块是个装饰？</h2>
							<div class="content">
								<p>以后不是。</p>
								<p>如您所见，在 FFBox 迭代的过程中，经历了那么多次技术重构。事实上，只有将开发环境搞好，才方便去做一些复杂的功能。这些功能将会在以后被加上。</p>
								<p><i>(2024/04/01 更新)</i> <span style="opacity: 0.5;">预估是有点难度了。我在公司做过类似的编排组件，真的很不好搞。一段时间内这个功能是不会上线了。</span></p>
							</div>
						</section>
						<section class="faqbrick">
							<h2 class="title">这款软件花了这么长时间去做，能赚到钱吗？</h2>
							<div class="content">
								<p>我不关心。</p>
							</div>
						</section>
						<section class="faqbrick">
							<h2 class="title">我好像找不到下载按钮呀？</h2>
							<div class="content">
								<p><a href="#" @click="showBigDownloadButton = true">点此下载</a></p>
							</div>
						</section>
						<section class="faqbrick">
							<h2 class="title">有女朋友吗？</h2>
							<div class="content">
								<p>一定程度上的母单。</p>
							</div>
						</section>
						<section class="faqbrick">
							<h2 class="title">有联系方式吗？</h2>
							<div class="content">
								<p>(∩❛ڡ❛∩)</p>
							</div>
						</section>
						<section class="faqbrick">
							<h2 class="title">有……？</h2>
							<div class="content">
								<p>别问了，庄园里的小摩尔都钻进被窝里环游星空了。</p>
								<p>走吧，页面到底儿了。</p>
							</div>
						</section>
					</div>
				</div>	
			</div>
		</div>
		<div class="bigDownloadButton" v-if="showBigDownloadButton">
			<div class="mask"></div>
			<div class="box" :style="{ zoom: bigDownloadButtonZoomValue }">
				<p class="line1">上面那么大个按钮找不到<br />倒要来这找小按钮🤣</p>
				<button @click="handleTopBarButtonClicked(3)" class="startbutton startbutton-green">⬇️下载</button>
				<p>嗱，够唔够大啊？</p>
			</div>
		</div>
	</div>
</template>

<style scoped lang="less">
	/* 自适应布局项 */
	@media only screen and (max-width: 1079.9px) {
		.lrMargin {
			width: 100%;
		}
		.faqbrick-wrapper {
			column-count: 1;
		}
	}
	@media only screen and (min-width: 1080px) {
		.lrMargin {
			padding-left: calc(30% - 300px);
			padding-right: calc(30% - 300px);
		}
		.faqbrick-wrapper {
			column-count: 2;
		}
	}

	@media only screen and (max-width: 599.9px) {
		.ttqftechlogo {
			width: 40px;
		}
	}
	@media only screen and (min-width: 600px) {
		.ttqftechlogo {
			width: 240px;
		}
	}

	/* 固定布局项——顶栏 */
	.topBar {
		position: fixed;
		width: 100%;
		height: 80px;
		box-sizing: border-box;
		background-color: hwb(var(--bg94) / 0.8);
		z-index: 10;
		.nav {
			display: inline-block;
			height: 80px;
			transform: translateY(-4px);
			padding: 0px 16px;
			opacity: 0.95;
			color: inherit;
			transition: transform 0.2s ease, background 0.2s ease;
			&:hover {
				transform: translateY(0px);
				background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0));
			}
			&>* {
				height: 40px;
				line-height: 40px;
				margin-top: 24px;
			}
		}
		.ttqftechlogo {
			background-image: url(../assets/ttqftechlogo.png);
			background-repeat: no-repeat;
			background-size: cover;
		}
	}
	.firstScreen {
		position: relative;
		// height: calc(100vh + 64px);
		max-height: 1280px;
		overflow: hidden;
		isolation: isolate;
		.lrCenter {
			text-align: center;
			.title-1 {
				width: 368px;
				margin-top: 184px;
			}
			.actions {
				display: flex;
				justify-content: center;
				align-items: center;
				isolation: isolate;
				button {
					padding: 6px 14px 6px 18px;
					letter-spacing: 4px;
					color: var(--66);
					background: none;
					border-radius: 6px;
					border: 1px solid transparent;
					z-index: 1;
					transition: all 0.1s linear;
					&:hover {
						border-top: 1px solid rgba(0, 0, 0, 0.1);
						border-left: 1px solid rgba(0, 0, 0, 0.1);
						border-right: 1px solid rgba(0, 0, 0, 0.1);
						border-bottom: 1px solid rgba(0, 0, 0, 0.2);
						background-color: hwb(var(--bg100));
						color: var(--primaryColor);
						transition: all 0.5s cubic-bezier(0.1, 2.5, 0.3, 1);
						cursor: pointer;
					}
				}
				.seperator {
					display: inline-block;
					width: 1px;
					height: 16px;
					margin: 0 -1px;
					background-color: #777;
				}
			}
		}
		.FFBox-topWrapper {
			position: absolute;
			width: 100%;
			transition: top 1.0s cubic-bezier(0.6, 0.2, 0.3, 1) 0.1s;
			.FFBox-wrapper {
				position: absolute;
				width: 1080px;
				height: 720px;
				left: 0;
				right: 0;
				// top: calc(0% + 480px);
				margin: auto;
				box-shadow: 0 10px 28px hwb(0 0% 100% / 0.3);
				border-radius: 8px;
				&>img {
					position: absolute;
					width: 1080px;
					height: 720px;
				}
				.FFBox {
					position: absolute;
					left: 1px;
					top: 1px;
					width: 1078px;
					height: 718px;
					border-radius: 8px;
					text-align: center;
					overflow: hidden;
					.startbutton {
						position: absolute;
						top: 46px;
						width: 120px;
						height: 36px;
						text-align: center;
						line-height: 36px;
						font-size: 20px;
						letter-spacing: 4px;
						text-indent: 2px;
						color: #FFF;
						text-shadow: 0px 1px 1px rgba(0, 0, 0, 0.5);
						border-radius: 10px;
						border: none;
						outline: none;
						cursor: pointer;
						&:hover:before {
							position: absolute;
							left: 0;
							content: "";
							width: 100%;
							height: 100%;
							border-radius: 10px;
							background: -webkit-linear-gradient(-90deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0));
						}
					}
					.startbutton1 {
						right: 16px;
					}
					.startbutton2 {
						right: 160px;
						width: 140px;
					}
				}
			}
		}
	}
	.screen2 {
		margin-top: -24px;
		border-radius: 32px 32px 0 0;
		background-color: hwb(var(--bg96));
		box-shadow: 0 0 48px hwb(var(--hoverShadow) / 0.3), // 外阴影（远）
					0 0 4px 2px hwb(220 15% 20% / 0.1), // 外阴影（近）
					0 4px 2px -2px hwb(var(--highlight) / 0.6) inset;	// 上高光;
		overflow: hidden; // BFC
		isolation: isolate;
		/* 固定布局项——FAQ */
		h1 {
			text-align: center;
		}
		.faqbrick-wrapper {
			column-gap: 20px;
			padding-bottom: 20px;
			.faqbrick {
				position: relative;
				padding: 8px 0;
				margin-bottom: 20px;
				background-color: hwb(var(--bg98));
				box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
				border-radius: 8px;
				break-inside: avoid;
				.title {
					margin: 20px;
					line-height: 1.5em;
					// font-family: "苹方 粗体", "PingFang SC", 苹方, 微软雅黑, "Segoe UI", Consolas, Avenir, Arial, Helvetica, sans-serif, 黑体;
					font-size: 1.4em;
					font-weight: 600;
				}
				.content {
					margin: 20px;
					p {
						margin: 8px 0;
						// font-family: "苹方 中等", "PingFang SC", 苹方, 微软雅黑, "Segoe UI", Consolas, Avenir, Arial, Helvetica, sans-serif, 黑体;
						line-height: 1.8em;
						font-size: 0.9em;
						font-weight: 500;
					}
				}
			}
		}

	}
	.bigDownloadButton {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: #00000077;
		z-index: 5;
		.box {
			width: 180px;
			height: 160px;
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
			border-radius: 8px;
			background-color: hwb(var(--bg97) / 0.8);
			box-shadow: 0 3px 2px -2px hwb(var(--highlight)) inset,	// 上亮光
						0 16px 32px 0px hwb(var(--hoverShadow) / 0.02),
						0 6px 6px 0px hwb(var(--hoverShadow) / 0.02),
						0 0 0 1px hwb(var(--highlight) / 0.9);	// 包边
			text-align: center;
			.line1 {
				font-size: 10px;
			}
			.startbutton {
				position: relative;
				width: 120px;
				height: 36px;
				text-align: center;
				line-height: 36px;
				font-size: 20px;
				letter-spacing: 4px;
				text-indent: 2px;
				color: #FFF;
				text-shadow: 0px 1px 1px rgba(0, 0, 0, 0.5);
				border-radius: 10px;
				border: none;
				outline: none;
				cursor: pointer;
				&:hover:before {
					position: absolute;
					left: 0;
					content: "";
					width: 100%;
					height: 100%;
					border-radius: 10px;
					background: -webkit-linear-gradient(-90deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0));
				}
			}

		}
	}

	// 主题
	.mainFrame[data-color_theme="themeLight"] {
		.startbutton-green {
			background: linear-gradient(180deg, hwb(120 40% 10%), hwb(120 20% 20%));
			box-shadow: 0px -1px 1px 0px rgba(255, 255, 255, 0.3),	// 去除上方阴影
						0px 1px 1px 0px rgba(16, 16, 16, 0.15),	// 按钮厚度
						0px 2px 6px 0px rgba(0, 0, 0, 0.1),	// 按钮阴影
						0px 4px 16px -4px hwb(120 40% 10%);	// 按钮发光和远距阴影
			&:active {
				background: linear-gradient(180deg, hwb(120 10% 40%), hwb(120 20% 20%));
			}
			&:hover {
				box-shadow: 0px -1px 1px 0px rgba(255, 255, 255, 0.3),
							0px 1px 1px 0px rgba(16, 16, 16, 0.15),
							0px 2px 6px 0px rgba(0, 0, 0, 0.1),
							0px 4px 24px 0px hwb(120 40% 10%);
			}
		}
		.startbutton-cyan {
			background: linear-gradient(180deg, hwb(180 20% 15%), hwb(180 10% 30%));
			box-shadow: 0px -1px 1px 0px rgba(255, 255, 255, 0.3),	// 去除上方阴影
						0px 1px 1px 0px rgba(16, 16, 16, 0.15),	// 按钮厚度
						0px 2px 6px 0px rgba(0, 0, 0, 0.1),	// 按钮阴影
						0px 4px 16px -4px hwb(180 20% 15%);	// 按钮发光和远距阴影
			&:active {
				background: linear-gradient(180deg, hwb(180 10% 40%), hwb(180 10% 30%));
			}
			&:hover {
				box-shadow: 0px -1px 1px 0px rgba(255, 255, 255, 0.3),
							0px 1px 1px 0px rgba(16, 16, 16, 0.15),
							0px 2px 6px 0px rgba(0, 0, 0, 0.1),
							0px 4px 24px 0px hwb(180 40% 10%);
			}
		}
	}
	.mainFrame[data-color_theme="themeDark"] {
		.startbutton-green {
			background: linear-gradient(180deg, hwb(120 20% 10%), hwb(120 10% 30%));
			box-shadow: 0px 1px 1px 0px rgba(16, 16, 16, 0.15),	// 按钮厚度
						0px 2px 6px 0px rgba(0, 0, 0, 0.1),	// 按钮阴影
						0px 4px 16px -4px hwb(120 40% 10%);	// 按钮发光和远距阴影
			&:active {
				background: linear-gradient(180deg, hwb(120 5% 50%), hwb(120 10% 30%));
			}
			&:hover {
				box-shadow: 0px -1px 1px 0px rgba(255, 255, 255, 0.3),
							0px 1px 1px 0px rgba(16, 16, 16, 0.15),
							0px 2px 6px 0px rgba(0, 0, 0, 0.1),
							0px 4px 24px 0px hwb(120 20% 10%);
			}
		}
		.startbutton-cyan {
			background: linear-gradient(180deg, hwb(180 15% 10%), hwb(180 10% 35%));
			box-shadow: 0px 1px 1px 0px rgba(16, 16, 16, 0.15),	// 按钮厚度
						0px 2px 6px 0px rgba(0, 0, 0, 0.1),	// 按钮阴影
						0px 4px 16px -4px hwb(180 40% 10%);	// 按钮发光和远距阴影
			&:active {
				background: linear-gradient(180deg, hwb(180 5% 50%), hwb(180 10% 35%));
			}
			&:hover {
				box-shadow: 0px -1px 1px 0px rgba(255, 255, 255, 0.3),
							0px 1px 1px 0px rgba(16, 16, 16, 0.15),
							0px 2px 6px 0px rgba(0, 0, 0, 0.1),
							0px 4px 24px 0px hwb(180 15% 10%);
			}
		}
	}

</style>