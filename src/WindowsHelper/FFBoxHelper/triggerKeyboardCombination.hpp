#pragma once
#include <Windows.h>
#include <iostream>

//////////////// ���Ͷ��� ////////////////

// typedef BOOL(WINAPI* pfnGetWindowRect)(HWND, LPRECT);
// typedef HMENU(WINAPI* pfnGetSystemMenu)(HWND, BOOL);
// typedef BOOL(WINAPI* pfnTrackPopupMenu)(HMENU, UINT, int, int, int, HWND, RECT*);
// typedef BOOL(WINAPI* pfnTrackPopupMenuEx)(HMENU, UINT, int, int, HWND, LPTPMPARAMS);
// typedef LRESULT(WINAPI* pfnSendMessage)(HWND, UINT, WPARAM, LPARAM);

//////////////// ����ʵ�� ////////////////

bool triggerKeyboardCombination(int index) {
	std::cout << "triggerKeyboardCombination: " << index << std::endl;

	bool success = false;

	switch (index)
	{
	case 0: {
		// ���� SystemMenu��Alt + Space��

		// // ��� API ������
		// HMODULE hUser = LoadLibrary(L"user32.dll");
		// auto getWindowRect = (pfnGetWindowRect)GetProcAddress(hUser, "GetWindowRect");
		// auto getSystemMenu = (pfnGetSystemMenu)GetProcAddress(hUser, "GetSystemMenu");
		// auto trackPopupMenu = (pfnTrackPopupMenu)GetProcAddress(hUser, "TrackPopupMenu");
		// auto trackPopupMenuEx = (pfnTrackPopupMenuEx)GetProcAddress(hUser, "TrackPopupMenuEx");
		// // auto sendMessage = (pfnSendMessage)GetProcAddress(hUser, "SendMessageA");

		// // ���д���
		// RECT pos;
		// getWindowRect((HWND)hWnd, &pos);
		// HMENU hMenu = getSystemMenu((HWND)hWnd, false);
		// int cmd = trackPopupMenu(hMenu, TPM_CENTERALIGN | TPM_RETURNCMD, pos.left, pos.top, 0, (HWND)hWnd, NULL);
		// // int result = 0;
		// // if (cmd > 0 || true) {
		// // 	result = sendMessage((HWND)hWnd, 0x112, cmd, 0);
		// // }
		// if (cmd == 0) {
		// 	std::cout << "ִ�д���" << GetLastError() << std::endl;
		// }
		// else {
		// 	std::cout << "ִ�н����" << cmd << std::endl;
		// }

		INPUT inputs[4] = {};
		ZeroMemory(inputs, sizeof(inputs));

		inputs[0].type = INPUT_KEYBOARD;
		inputs[0].ki.wVk = VK_LMENU;

		inputs[1].type = INPUT_KEYBOARD;
		inputs[1].ki.wVk = VK_SPACE;

		inputs[2].type = INPUT_KEYBOARD;
		inputs[2].ki.wVk = VK_SPACE;
		inputs[2].ki.dwFlags = KEYEVENTF_KEYUP;

		inputs[3].type = INPUT_KEYBOARD;
		inputs[3].ki.wVk = VK_LMENU;
		inputs[3].ki.dwFlags = KEYEVENTF_KEYUP;

		UINT uSent = SendInput(ARRAYSIZE(inputs), inputs, sizeof(INPUT));
		success = uSent == ARRAYSIZE(inputs);
		break;
	}
	case 1: {
		// ���� Snap Layout��Windows 11��

		INPUT inputs[4] = {};
		ZeroMemory(inputs, sizeof(inputs));

		inputs[0].type = INPUT_KEYBOARD;
		inputs[0].ki.wVk = VK_LWIN;

		inputs[1].type = INPUT_KEYBOARD;
		inputs[1].ki.wVk = 'Z';

		inputs[2].type = INPUT_KEYBOARD;
		inputs[2].ki.wVk = 'Z';
		inputs[2].ki.dwFlags = KEYEVENTF_KEYUP;

		inputs[3].type = INPUT_KEYBOARD;
		inputs[3].ki.wVk = VK_LWIN;
		inputs[3].ki.dwFlags = KEYEVENTF_KEYUP;

		UINT uSent = SendInput(ARRAYSIZE(inputs), inputs, sizeof(INPUT));
		success = uSent == ARRAYSIZE(inputs);
		break;
	}
	}
	if (!success)
	{
		std::cout << "�����ʧ�ܣ�" << GetLastError();
	}
	return true;
}
