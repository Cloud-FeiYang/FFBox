import { computed, defineComponent, FunctionalComponent, ref } from 'vue'; // defineComponent 的主要功能是提供类型检查
import { TaskStatus, UITask } from '@common/types';
import { generator as vGenerator } from '@common/vcodecs';
import { generator as aGenerator } from '@common/acodecs';
import IconPreview from '@renderer/assets/video.svg';
import IconRightArrow from '@renderer/assets/mainArea/swap_right.svg';
import style from './TaskItem.module.less';

interface Props {
	task: UITask;
}

export const TaskItem: FunctionalComponent<Props> = (props) => {
	const { task } = props;
	const showParams = ref(true);
	const showDashboard = ref(true);
	const showCmd = ref(true);

	// #region 参数

	const beforeBitrateFilter = (kbps: number) => {
		if (isNaN(kbps)) {
			return '读取中';
		} else if (kbps >= 10000) {
			return (kbps / 1000).toFixed(1) + ' Mbps';
		} else {
			return kbps + ' kbps';
		}
	};
	const smpteBefore = computed(() => task.before.vresolution && task.before.vframerate ? `${task.before.vresolution.replace('<br />', '×')}@${task.before.vframerate}` : '-');
	const videoRateControlValue = computed(() => vGenerator.getRateControlParam(task.after.video).value);
	const audioRateControlValue = computed(() => aGenerator.getRateControlParam(task.after.audio).value);
	const videoRateControl = computed(() => (videoRateControlValue.value === '-' ? '' : `@${task.after.video.ratecontrol} ${videoRateControlValue.value}`));
	const audioRateControl = computed(() => (audioRateControlValue.value === '-' ? '' : `@${task.after.audio.ratecontrol} ${audioRateControlValue.value}`));
	const videoInputBitrate = computed(() => task.before.vbitrate > 0 ? `@${beforeBitrateFilter(task.before.vbitrate)}` : '');
	const audioInputBitrate = computed(() => task.before.abitrate > 0 ? `@${beforeBitrateFilter(task.before.abitrate)}` : '');

	// #endregion

	// #region 仪表盘

	const graphBitrateFilter = (kbps: number) => {
		if (kbps >= 10000) {
			return (kbps / 1000).toFixed(1) + ' M';
		} else {
			return (kbps / 1000).toFixed(2) + ' M';
		}
	};
	const graphBitrate = computed(() => graphBitrateFilter(task.dashboard_smooth.bitrate));
	const speedFilter = (value: number) => {
		if (value < 10) {
			return value.toFixed(2) + ' ×';
		} else {
			return value.toFixed(1) + ' ×';
		}
	};
	const graphSpeed = computed(() => speedFilter(task.dashboard_smooth.speed));
	const timeFilter = (value: number) => {
		let left = value;
		let hour = Math.floor(left / 3600); left -= hour * 3600;
		let minute = Math.floor(left / 60); left -= minute * 60;
		let second = left;
		if (hour) {
			return `${hour}:${minute.toString().padStart(2, '0')}:${second.toFixed(0).toString().padStart(2, '0')}`;
		} else if (minute) {
			return `${minute}:${second.toFixed(1).padStart(4, '0')}`;
		} else {
			return second.toFixed(2);
		}
	};
	// const graphTime = computed(() => timeFilter(task.dashboard_smooth.time));
	const graphTime = { value: '1:59:59'};

	// 圆环 style 部分
	// 计算方式：(log(数值) / log(底，即每增长多少倍数为一格) + 数值为 1 时偏移多少格) / 格数
	// 　　　或：(log(数值 / 想要以多少作为最低值) / log(底，即每增长多少倍数为一格)) / 格数
	const graphBitrateStyle = computed(() => {
		let value = Math.log(task.dashboard_smooth.bitrate / 62.5) / Math.log(8) / 4;		// 62.5K, 500K, 4M, 32M, 256M
		value = Math.min(Math.max(value, 0), 1);
		return `background: conic-gradient(#36D 0%, #36D ${value * 75}%, #DDD ${value * 75}%, #DDD 75%, transparent 75%)`;
	});
	const graphSpeedStyle = computed(() => {
		let value = Math.log(task.dashboard_smooth.speed / 0.04) / Math.log(5) / 6;			// 0.04, 0.2, 1, 5, 25, 125, 625
		value = Math.min(Math.max(value, 0), 1);
		return `background: conic-gradient(#36D 0%, #36D ${value * 75}%, #DDD ${value * 75}%, #DDD 75%, transparent 75%)`;
	});
	// 线性 style 部分
	const graphTimeStyle = computed(() => {
		const valueOdd = Math.min(task.dashboard_smooth.time % 2, 1);
		const valueEven = Math.max(task.dashboard_smooth.time % 2 - 1, 0);
		return `background: linear-gradient(#DDD 0%, #DDD ${valueEven * 100}%, #36D ${valueEven * 100}%, #36D ${valueOdd * 100}%, #DDD ${valueOdd * 100}%, #DDD 100%, transparent 100%)`;
	});
	const graphFrameStyle = computed(() => {
		const valueOdd = Math.min(task.dashboard_smooth.frame % 2, 1);
		const valueEven = Math.max(task.dashboard_smooth.frame % 2 - 1, 0);
		return `background: linear-gradient(#DDD 0%, #DDD ${valueEven * 100}%, #36D ${valueEven * 100}%, #36D ${valueOdd * 100}%, #DDD ${valueOdd * 100}%, #DDD 100%, transparent 100%)`;
	});

	// const overallProgress = computed(() => task.transferStatus === 'normal' ? task.dashboard_smooth.progress : task.dashboard_smooth.transferred / task.transferProgressLog.total);
	const overallProgress = { value: 0.99 };
	const overallProgressDescription = computed(() => task.transferStatus === 'normal' ? '转码进度' : '上传进度');

	// #endregion
	
	// console.log(task.fileBaseName, videoRateControl.value, videoRateControl.value);
	// console.log(props);

	const deleteButtonBackgroundPositionX = computed(() => {
		switch (task.status) {
			case TaskStatus.TASK_STOPPED:
				return '0px';	// 删除按钮
			case TaskStatus.TASK_RUNNING:
				return '-16px';	// 暂停按钮
			case TaskStatus.TASK_PAUSED: case TaskStatus.TASK_STOPPING: case TaskStatus.TASK_FINISHING: case TaskStatus.TASK_FINISHED: case TaskStatus.TASK_ERROR:
				return '-32px';	// 重置按钮
		}
		return '';
	});
	// 整个任务项的高度，包括上下 margin
	const taskHeight = computed(() => {
		let height = 4;
		height += showParams.value ? 24 : 0;
		height += showDashboard.value ? 72 : 0;
		height += showCmd.value ? 64 : 0;
		height = Math.max(24, height);
		return height;
	});

	return (
		<div class={style.taskWrapper1}>
			<div class={style.taskWrapper2}>
				<div class={style.task} style={{ height: `${taskHeight.value}px` }}>
					<div class={style.backgroundWhite}></div>
					<div class={style.previewIcon} style={{ bottom: showCmd.value ? '66px' : undefined}}>
						<IconPreview />
					</div>
					<div class={style.taskName} style={showDashboard.value ? { '-webkit-line-clamp': 4 } : {}}>{task.fileBaseName ?? '读取中'}</div>
					{showParams.value && (
						<div class={style.paraArea}>
							<div class={style.divider}><div></div></div>
							{/* 容器 */}
							<div class={style.formatBefore}>{task.before.format}</div>
							<div class={style.formatTo}><IconRightArrow /></div>
							<div class={style.formatAfter}>{task.after.output.format}</div>
							<div class={style.divider}><div></div></div>
							{/* 分辨率码率 */}
							<div class={style.smpteBefore}>{smpteBefore.value}</div>
							<div class={style.smpteTo}><IconRightArrow /></div>
							<div class={style.smpteAfter}>{task.after.video.resolution}@{task.after.video.framerate}</div>
							<div class={style.divider}><div></div></div>
							{/* 视频 */}
							<div class={style.videoBefore}>{task.before.vcodec}{videoInputBitrate.value}</div>
							<div class={style.videoTo}><IconRightArrow /></div>
							<div class={style.videoAfter}>{task.after.video.vcodec}{videoRateControl.value}</div>
							<div class={style.divider}><div></div></div>
							{/* 音频 */}
							<div class={style.audioBefore}>{task.before.acodec}{audioInputBitrate.value}</div>
							<div class={style.audioTo}><IconRightArrow /></div>
							<div class={style.audioAfter}>{task.after.audio.acodec}{audioRateControl.value}</div>
						</div>
					)}
					{showDashboard.value && (
						<div class={style.dashboardArea} style={{ top: `${(showParams.value ? 1 : 0) * 24 + 2}px` }}>
							<div class={style.linearGraphItems}>
								<div class={style.linearGraphItem}>
									<div class={style.line} style={graphTimeStyle.value}></div>
									<span class={style.data}>{ graphTime.value }</span>
									<span class={style.description}>时间</span>
								</div>
								<div class={style.linearGraphItem}>
									<div class={style.line} style={graphFrameStyle.value}></div>
									<span class={style.data}>{ task.dashboard_smooth.frame.toFixed(0) }</span>
									<span class={style.description}>帧</span>
								</div>
							</div>
							<div class={style.roundGraphItem}>
								<div class={style.ring} style={graphBitrateStyle.value}></div>
								<span class={style.data}>{ graphBitrate.value }</span>
								<span class={style.description}>码率</span>
							</div>
							<div class={style.roundGraphItem}>
								<div class={style.ring} style={graphSpeedStyle.value}></div>
								<span class={style.data}>{ graphSpeed.value }</span>
								<span class={style.description}>速度</span>
							</div>
							<div class={style.overallProgressItem}>
								<span class={style.data}>{ overallProgress.value === 1 ? '🆗' : `${(overallProgress.value * 100).toFixed(1)}%` }</span>
								<span class={style.description}>{ overallProgressDescription.value }</span>
							</div>
						</div>
					)}
					{showCmd.value && (
						<div class={style.cmdArea} style={{ top: `${(showParams.value ? 1 : 0) * 24 + (showDashboard.value ? 1 : 0) * 72 + 2}px` }}>
							<div class={style.margin}>
								<div class={style.switch}>
									<div class={style.item}>输入</div>
									<div class={`${style.item} ${style.itemSelected}`}>输出</div>
								</div>
								<div class={style.code}>
									<textarea aria-label="任务命令行" readonly value={task.cmdData}></textarea>
								</div>
							</div>
						</div>
					)}
					<div class={style.vline} style={{ bottom: showCmd.value ? '66px' : undefined}}><div></div></div>
					<button aria-label='重置或删除任务' class={style.button} style={{ bottom: showCmd.value ? '66px' : undefined}}>
						<div style={{ backgroundPositionX: deleteButtonBackgroundPositionX.value }}></div>
					</button>
				</div>
			</div>
		</div>
	);
};

// export const TaskItem = defineComponent({
// 	setup() {
// 		return () => (
// 			<div class={style.red}>Helloo!!!</div>
// 		);
// 	}
// });

// export const TaskJtem = defineComponent({
// 	render() {
// 		return <div>Vue 3.0</div>;
// 	},
// });
