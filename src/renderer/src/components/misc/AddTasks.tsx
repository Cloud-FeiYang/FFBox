import { computed, defineComponent, defineExpose, onMounted, ref } from "vue";
import nodeBridge from "@renderer/bridges/nodeBridge";
import { useAppStore } from "@renderer/stores/appStore";
// import RadioList, { Props as RadioListProps } from '@renderer/containers/MainFrame/MainArea/ParaBox/components/RadioList.vue';
import Msgbox from "../Msgbox/Msgbox";
import Button, { ButtonType } from '@renderer/components/Button/Button';
import style from './AddTasks.module.less';
import Popup from "../Popup/Popup";

// const selectionList: RadioListProps['list'] = [
// 	{ value: 'batch', caption: '分别处理' },
// 	{ value: 'concat', caption: '拼接' },
// ];

export function showAddTaskPrompt(initialValue?: string) {
	let compFuncs: any;
	const appStore = useAppStore();
    Msgbox({
		container: document.body,
		title: '添加任务',
		content: <Comp exportFunctions={(fs) => compFuncs = fs} initialValue={initialValue} />,
		buttons: [
			{ text: '好', role: 'confirm', type: ButtonType.Primary, callback: async () => {
				const result = await compFuncs.exportData();
				// console.log(result);
				appStore.addTasks(result);
			} },
			{ text: '取消', role: 'cancel' },
		]
	});
}
interface P {
	initialValue: string;
    exportFunctions: (fs: any) => void;
}
const Comp = defineComponent((props: P) => {
	const text = ref('');
	const computing = ref(0);	// 0：空闲　负随机数：正在计算　正整数：等待下一次触发计算的计时器序号
	const confirming = ref(false);
	const categorized = ref({
		localFilesCount: 0,
		localDirsCount: 0,
		remotesCount: 0,
		unknownsCount: 0,
		lineResults: [],
	});
	const inputRef = ref<HTMLTextAreaElement>();

	const statsText = computed(() => {
		if (confirming.value) {
			return '正在展开路径';
		} else if (computing.value) {
			return '正在统计中';
		} else {
			// const lf = categorized.value.localFiles.length;
			// const ld = categorized.value.localDirs.length;
			// const r = categorized.value.remotes.length;
			// const u = categorized.value.unknowns.length;
			const { localFilesCount: lf, localDirsCount: ld, remotesCount: r, unknownsCount: u } = categorized.value;
			if (lf + ld + r + u === 0) {
				return '您未添加文件';
			} else {
				return `您已添加${lf ? ` ${lf} 个本地${window.jsb ? '文件' : '路径'}，` : ''}${ld ? ` ${ld} 个本地文件夹，` : ''}${r ? ` ${r} 个远程路径，` : ''}${u ? ` ${u} 个未知文件，` : ''}`.slice(0, -1);
			}
		}
	});

	const handleAddFilesButtonClick = () => {
		showOpenFilePrompt().then((files) => {
			let newPaths: string[] = [];
			for (const file of files || []) {
				newPaths.push(file.path);	// 只有 electron 环境有这个按钮，所以可以直接用 path
			}
			newPaths = newPaths.filter((line) => line !== '');
			if (text.value.length && !text.value.endsWith('\n')) {
				text.value += '\n'	;
			}
			text.value += newPaths.join('\n');
			inputRef.value.value = text.value;
			handleTextInputAndCategorize();
		});
	};

	/** 不传入 event 时此函数用于刷新统计信息，传入 event 时附带修改 text.value 功能 */
	const handleTextInputAndCategorize = (event?: Event) => {
		if (computing.value) {
			// 上一次请求尚未完成，则等待 33ms 再检查一遍
			clearTimeout(computing.value);
			computing.value = setTimeout(() => handleTextInputAndCategorize(), 33) as any;
			return;
		}
		computing.value = -Math.random();
		if (event) {
			text.value = event.target.value;
		}
		nodeBridge.getPathsCategorized(text.value).then((result) => {
			categorized.value.localFilesCount = result.localFilesCount;
			categorized.value.localDirsCount = result.localDirsCount;
			categorized.value.remotesCount = result.remotesCount;
			categorized.value.unknownsCount = result.unknownsCount;
			categorized.value.lineResults = result.lineResults;
			if (computing.value > 0) {
				// 如果有计时器正在等待，那么结束等待马上进行最后一次计算
				clearTimeout(computing.value);
				computing.value = 0;
				handleTextInputAndCategorize();
			} else {
				computing.value = 0;
			}
		});
	};

	const handleTextDrop = (event: DragEvent) => {
		event.preventDefault();	// 避免浏览器下载文件
		let newPaths: string[] = [];
		if (event.dataTransfer?.files?.length) {
			if (nodeBridge.env === 'browser') {
				Popup({ message: '网页版无法将文件拖入文本框，请直接将文件拖入任务列表进行上传😊' });
			}
			for (const file of event.dataTransfer?.files || []) {
				newPaths.push(file.path);
			}
		} else if (event.dataTransfer?.items) {
			const text = event.dataTransfer?.getData('text/plain');
			newPaths = text.replaceAll('\r\n', '\n').split('\n');
		}
		newPaths = newPaths.filter((line) => line !== '');
		if (text.value.length && !text.value.endsWith('\n')) {
			text.value += '\n'	;
		}
		text.value += newPaths.join('\n');
		inputRef.value.value = text.value;
		handleTextInputAndCategorize();
	};

	const exports = {
		exportData: async () => {
			inputRef.value.disabled = true;
			confirming.value = true;
			while (computing.value) {
				// console.log('等待统计');
				await new Promise((resolve) => { setTimeout(resolve, 100)});	// 循环等待，哈哈，简单方便快捷
			}
			// console.log('开始遍历');
			const finalList: string[] = [];
			const lines = text.value.split('\n').filter((line) => line !== '');
			for (let i = 0; i < lines.length; i++) {
				if (['lf', 'r'].includes(categorized.value.lineResults[i])) {
					finalList.push(lines[i]);
				} else if (categorized.value.lineResults[i] === 'ld') {
					const subFilesResult = await nodeBridge.listItemsInDirectory(lines[i], { mode: 'getFiles', recursive: true, fullPath: true });
					finalList.push(...subFilesResult);
				}
			}
			// console.log('遍历结束', finalList);
			return finalList;
		}
	};

    onMounted(() => {
		text.value = (props.initialValue ?? '').replaceAll('\r\n', '\n');
		inputRef.value.value = text.value;
		handleTextInputAndCategorize();
        props.exportFunctions(exports);
    });

	return () => (
		<div class={style.container}>
			<div class={style.line1}>
				{nodeBridge.env === 'electron' ? (
					<Button type={ButtonType.Primary} onClick={handleAddFilesButtonClick}>添加文件</Button> 
				) : (
					<i>此输入框仅用于直接控制服务器进行任务添加<br/>若需处理本地文件请从菜单选择「任务」→「添加任务（选择文件）」</i>
				)}
				<span>{statsText.value}</span>
			</div>
            <textarea ref={inputRef} onInput={handleTextInputAndCategorize} onChange={handleTextInputAndCategorize} onDrop={handleTextDrop} />
			{/* <RadioList class={style.radioList} list={selectionList} value={type.value} onChange={(value: any) => type.value = value} /> */}
		</div>
	);
}, { props: ['initialValue', 'exportFunctions'] });

export function showOpenFilePrompt() {
	return new Promise<FileList>((resolve, reject) => {
		const appStore = useAppStore();

		const elem = document.createElement('input');
		elem.type = 'file';
		elem.multiple = true;
		document.body.appendChild(elem);
		// elem.click();
		const ev = new MouseEvent('click');
		elem.dispatchEvent(ev);
		document.body.removeChild(elem);
		elem.onchange = () => {
			resolve(elem.files);
		};
	});
}
