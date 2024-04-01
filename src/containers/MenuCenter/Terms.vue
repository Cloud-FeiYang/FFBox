<script setup lang="ts">
import { computed, Component, h } from 'vue';
import SimpleMarkdown from '@khanacademy/simple-markdown';
import { useAppStore } from '../../stores/appStore';
import Msgbox from '../../components/Msgbox/Msgbox';
import Button, { ButtonType } from '../../components/Button/Button';
import Checkbox from '../../components/Checkbox/Checkbox.vue';
import IconReadBook from '../../assets/warnings/readbook.svg?component';
import IconBrick from '../../assets/warnings/brick.svg?component';

const appStore = useAppStore();

const licenseText = `\
# LICENSE AND TERMS OF USE 使用许可和条款

欢迎您使用 FFBox。您在使用 FFBox 源代码或 FFBox 二进制文件时，需遵循本文件的规定。

FFBox 源代码和二进制文件均免费向所有个体开放。
您可以阅读、拷贝与分发源代码，可以在不进行二次传播和分发的情况下修改、编译源代码并生成二进制文件，可以使用、传播、分发经官方渠道发布且未经修改的二进制文件，可以使用源代码进行二次创作（包括代码分析、与其他软件代码对比，以此为题材制作相关的视频、图文、音频），可以使用二进制文件进行二次创作（包括使用说明和经验分享、与其他软件的对比、纪录、恶搞，以此为题材制作相关的视频、图文、音频），可以使用本软件产品进行二次创作（包括配置文件分享、ffmpeg 输出文件的任何操作）。
以上二次创作均不得涉及软件激活、解锁等相关操作。以上行为除 ffmpeg 输出文件以外均不得进行非官方的盈利操作（包括但不限于篡改收款二维码、销售未经修改或部分修改后的软件与源代码、将二次创作内容放入需要付费开通阅读或观看权限的网站等）。

如果使用个体存在或曾经存在以下行为，则不得使用 FFBox，亦不得通过他人协助或协助他人的方式使用 FFBox（但若您仅开启了 FFBox 服务，而服务使用者与您并不存在交往，则不受此条款限制）：

- 同时与多个对象维持恋爱关系或模糊的亲密关系
- 通过隐瞒、欺骗他人等方式满足自身情感需求
- 操纵、滥用他人感情
- 对他人进行情感上的信任背离行为

FFBox 作者将保留对本许可与使用条款的解释权及随时修改的权利。

*2024-02-03*
`;

const content = computed(() => {
	const ast = SimpleMarkdown.defaultBlockParse(licenseText);
	const html = SimpleMarkdown.defaultHtmlOutput(ast);
	return html;
});

const handleCheckboxClicked = () => {
	if (!appStore.termsAgreed) {
		const licenseSlice = h('div', ['您是否没有以下的行为：', h('br'), '- 同时与多个对象维持恋爱关系或模糊的亲密关系', h('br'), '- 通过隐瞒、欺骗他人等方式满足自身情感需求', h('br'), '- 操纵、滥用他人感情', h('br'), '- 对他人进行情感上的信任背离行为']);
		Msgbox({
			image: h(IconReadBook),
			title: '请务必确认您符合协议的规定哦～',
			content: licenseSlice,
			buttons: [
				{ text: `Yes, I don't`, type: ButtonType.Primary, callback: () => appStore.termsAgreed = true },
				{ text: `No, I do`, type: ButtonType.Danger, callback: () => {
					Msgbox({
						image: h(IconBrick),
						title: '请再次确认您是否符合协议的规定！',
						content: licenseSlice,
						buttons: [
							{ text: `Yes, I don't`, type: ButtonType.Primary, callback: () => appStore.termsAgreed = true },
							{ text: `No, I do`, type: ButtonType.Danger, callback: () => {
								window.location.replace("about:blank");
								window.close();
							} },
						]
					});
				} },
			]
		});
	} else {
		appStore.termsAgreed = false;
	}
}

</script>

<template>
	<div>
		<article :innerHTML="content" />
		<div class="agreeBar" >
			<Button @click="handleCheckboxClicked">
				<Checkbox :checked="appStore.termsAgreed" />
				<span>我已阅读并同意该条款</span>
			</Button>
		</div>
	</div>
</template>

<style scoped lang="less">
	article {
		box-sizing: border-box;
		width: 100%;
		padding: 0 5%;
		/deep/ h1 {
			font-size: 22px;
		}
		/deep/ div {
			font-size: 15px;
			line-height: 25px;
			text-align: left;
			margin: 10px 0;
		}
		/deep/ ul {
			margin: 10px 0;
		}
		/deep/ li {
			font-size: 15px;
			line-height: 25px;
			text-align: left;
		}
	}
	.agreeBar {
		// position: absolute;
		// bottom: 0;
		height: 32px;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		// border-top: #77777777 1px solid;
		button {
			&>div {
				vertical-align: middle;
			}
			&>span {
				margin-left: 4px;
				vertical-align: middle;
			}
		}
	}
</style>