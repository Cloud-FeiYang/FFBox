import { getSingleArgvValue } from '@common/utils';
import { FFBoxService } from './FFBoxService';
import { version } from '@common/constants';

const helpText = `
Options:
  -?, -h, --help        显示 FFBoxService 帮助文档
  --port [number]       指定监听端口
  --loglevel [0|3|5|6]  信息显示级别（无|错误|事件|调试）
`;

console.log(`FFBoxService 版本 ${version} - FFBox 服务端程序`)
if (['-h', '-?', '--help'].some((t) => getSingleArgvValue(t))) {
	console.log(helpText);
} else {
	const service = new FFBoxService();
	service.on('serverError', () => {
		process.exit();
	});
	service.on('serverClose', () => {
		process.exit();
	});
}
