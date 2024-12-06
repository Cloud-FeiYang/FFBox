import { FunctionalComponent, ref, VNodeRef } from 'vue';
import { useAppStore } from '@renderer/stores/appStore';
import style from './index.module.less';
import RadioList from './components/RadioList.vue'
import Popup from '@renderer/components/Popup/Popup';
import { NotificationLevel } from '@common/types';

interface Props {}

const ShortcutView: FunctionalComponent<Props> = (props) => {
	const appStore = useAppStore();
	const containerRef = ref<VNodeRef>(null);
	const radioListList = [
		{ value: '默认配置' },
		...appStore.availablePresets.map((name) => ({
			value: name,
			editable: true,
			deletable: true,
		})),
		{ value: '', editable: true },
	];
	return (
		<div class={style.container} ref={containerRef}>
			<RadioList
				list={radioListList}
				value={appStore.presetName}
				placeholder="未保存设定"
				onChange={(value) => appStore.loadPreset(`${value}`)}
				onDelete={(value) => appStore.deletePreset(`${value}`)}
				onEdit={(oldValue, newValue) => {
					if (oldValue) {
						appStore.editPreset(oldValue, newValue);
					} else if (newValue) {
						if (newValue === '默认配置') {
							Popup({
								message: '不能这样起名哦，会出 bug 的~',
								level: NotificationLevel.error,
							});
							return;
						}
						appStore.savePreset(newValue);
					}
				}}
			/>
		</div>
	);
};

export default ShortcutView;
