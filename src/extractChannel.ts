import { GPU } from 'gpu.js';
import sharp from 'sharp';

import {
  loadImage,
  saveImage,
} from './utils/imageIOTools';

if (require.main === module) {
  const gpu = new GPU({
    mode: 'gpu'
  });


  (async () => {
    // load image
    const testImg = await loadImage('https://www.juliebergan.no/sites/g/files/g2000006326/f/sample-4.jpg');
    const rawImgBuffer = await sharp(testImg).raw()
      .toBuffer();

    const {
      height: imgHeight,
      width: imgWidth,
      channels: imgChannels,
      format: imgFormat
    } = await sharp(testImg).metadata();

    const extractChannel = gpu.createKernel(function (pixel: number[], channels: number, targetChannel: number) {
      if (Math.abs(this.thread.x % channels - targetChannel) < 0.01) {
        return pixel[this.thread.x];
      } else {
        return 0;
      }
    }).setOutput([imgWidth * imgHeight * imgChannels]);

    const outputRawImage = extractChannel(Array.from(rawImgBuffer), imgChannels, 0) as number[];

    const outputImage = await sharp(Buffer.from(outputRawImage), {
      raw: {
        channels: imgChannels,
        height: imgHeight,
        width: imgWidth
      }
    }).jpeg({ quality: 100 })
      .toBuffer();

    await saveImage('./data/extractChannel-Input.jpg', testImg);
    await saveImage('./data/extractChannel-Output.jpg', outputImage);
  })();
}
