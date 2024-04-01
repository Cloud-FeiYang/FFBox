<script setup lang="ts">
// 以下这句对全局有效
/// <reference types="vite-svg-loader" />
import { onMounted, watch } from 'vue';
import { useAppStore } from './stores/appStore';
import MainFrame from './containers/MainFrame.vue'

const appStore = useAppStore();

watch(() => appStore.colorTheme, (value) => {
	document.body.className = value;
}, { immediate: true });

onMounted(() => {
	const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
	const handleChange = (e) => {
		appStore.colorTheme = e.matches ? 'themeDark' : 'themeLight'
	};
	mediaQueryList.addEventListener('change', handleChange);
	handleChange(mediaQueryList);
});

</script>

<template>
	<MainFrame />
</template>

<style>
	body {
		margin: 0;
		background: hwb(var(--bg94));
	}
</style>
