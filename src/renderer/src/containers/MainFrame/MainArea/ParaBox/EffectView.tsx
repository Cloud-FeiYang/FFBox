import { FunctionalComponent, ref } from 'vue'; // defineComponent 的主要功能是提供类型检查
import nodeBridge from '@renderer/bridges/nodeBridge';
import Button, { ButtonType } from '@renderer/components/Button/Button';
import style from './index.module.less';

interface Props {}

const EffectView: FunctionalComponent<Props> = (props) => {
	const count = ref({ a: 1 });

	const jumpToFFmpegFilteringGuide = () => nodeBridge.jumpToUrl('https://trac.ffmpeg.org/wiki/FilteringGuide');
	const jumpToFFmpegFiltersDocumentation = () => nodeBridge.jumpToUrl('https://ffmpeg.org/ffmpeg-filters.html');

	return (
		<div class={style.container} style={{ padding: '16px', boxSizing: 'border-box' }}>
			<div style="text-align: center;">此功能暂未开发<br />您可通过视频/音频面板中的自定义参数手动输入滤镜</div>
			<div style={{ width: '100%', margin: '1em 0' }}>
				<Button onClick={jumpToFFmpegFilteringGuide}>🚩 FFmpeg 滤镜指南</Button>
				<Button onClick={jumpToFFmpegFiltersDocumentation}>📖 FFmpeg 滤镜文档</Button>
			</div>
		</div>
	);
};

export default EffectView;
