import fs from 'fs';
import { URL } from 'url';
import path from 'path';

import axios from 'axios';
import chalk from 'chalk';

interface LoadImageOption {
  allowCache?: boolean;
}

const CACHE_DIRECTORY = path.resolve(__dirname.replace('/src', ''), '.imgcache');

/**
 * Load a local or remote image file.
 * 
 * @param imagePath Image URL or local image file path
 * @param options 
 * @returns 
 */
export async function loadImage(imagePath: string | URL, options: LoadImageOption = {}) {
  let imageUrl: URL;
  let localImagePath: string;

  let imageData: Buffer;

  // Check if imagePath is url or localFilePath
  if (imagePath instanceof URL) {
    // URL
    imageUrl = imagePath;
  } else {
    try {
      // URL
      imageUrl = new URL(imagePath);
    } catch (err) {
      // Local File Path
      localImagePath = path.resolve(imagePath);
    }
  }

  if (imageUrl) {
    // remote image

    if (options.allowCache === undefined) {
      options.allowCache = true;
    }

    imageData = await downloadImage(imageUrl, options.allowCache);
  } else {
    // local image
    try {
      imageData = await fs.promises.readFile(localImagePath);
      console.info(`${chalk.green('Image Loaded')} (${localImagePath})`);
    } catch (err) {
      console.error(`${chalk.red('Failed to load image')} (${localImagePath})`);
      throw err;
    }
  }

  return imageData;
}

/**
 * Save the image locally.
 * 
 * @param imagePath 
 * @param imageData 
 */
export async function saveImage(imagePath: string, imageData: Buffer) {
  const resolvedImagePath = path.resolve(imagePath);

  console.info(`${chalk.bold('Saving image...')}
\t${chalk.blue('Resolved Path')} ${resolvedImagePath}
\t${chalk.blue('Filesize')} ${imageData.byteLength / 1000} KB`);

  try {
    await fs.promises.writeFile(resolvedImagePath, imageData);
    console.info(`${chalk.green(`Image saved`)} (${resolvedImagePath})`);
  } catch (err) {
    console.error(`${chalk.red('Failed to save image')} (${resolvedImagePath})`);
  }
}

async function downloadImage(imageUrl: URL, useCache: boolean = true) {
  const cachedImagePath = path.resolve(
    CACHE_DIRECTORY,
    getCachedFilenameFromUrl(imageUrl)
  );

  let imageData: Buffer;

  // lookup / load cache
  if (useCache) {
    try {
      await fs.promises.stat(cachedImagePath);
      imageData =  await fs.promises.readFile(cachedImagePath);
      console.info(`${chalk.green('Image Downloaded (cache)')} (${imageUrl.href})`);
      return imageData;
    } catch (err) {
      // no cache
    }
  }

  // Download Image
  try {
    const res = await axios.get(imageUrl.href, {
      responseType: 'arraybuffer'
    });
    imageData = Buffer.from(res.data, 'binary');

    console.info(`${chalk.green('Image Downloaded')} (${imageUrl.href})`);
  } catch (err) {
    console.error(`${chalk.red('Failed to download image')} (${imageUrl.href})`);
    throw err;
  }

  // store cache
  if (useCache) {
    // create cache directory if not exist
    try {
      await fs.promises.stat(CACHE_DIRECTORY);
    } catch (err) {
      await fs.promises.mkdir(CACHE_DIRECTORY, {
        recursive: true,
      });
    }

    try {
      await fs.promises.writeFile(cachedImagePath, imageData);
    } catch (err) {
      console.warn(`${chalk.yellow('Unable to cache image')} (${imageUrl.href}) -> (${cachedImagePath})`);
    }
  }

  return imageData;
}

function getCachedFilenameFromUrl(imageUrl: URL) {
  const { host, href, pathname } = imageUrl;

  return `${host}_${Buffer.from(href).toString('hex').slice(0, 32)}__${pathname.split('/').pop()}`;
}
