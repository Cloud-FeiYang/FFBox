import { defineStore } from 'pinia';

interface StoreState {
	// 界面类
	colorTheme: string;
	selectedPanelIndex: number;
	showMenuCenter: number;
	termsAgreed: boolean;
}

// useStore 可以是 useUser、useCart 之类的任何东西
// 第一个参数是应用程序中 store 的唯一 id
export const useAppStore = defineStore('app', {
	// other options...
	// 推荐使用 完整类型推断的箭头函数
	state: (): StoreState => {
		return {
			// 所有这些属性都将自动推断其类型
			// 界面类
			colorTheme: 'themeLight',
			selectedPanelIndex: -1,
			showMenuCenter: 0,
			termsAgreed: false,
		};
	},
});
