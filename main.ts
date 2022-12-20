import * as path from "https://deno.land/std/path/mod.ts";
import {existsSync} from "https://deno.land/std/fs/mod.ts";

interface LogbookFrame {
    DateTimeOriginal: string;
    Description: string;
    DocumentName: string
    ExposureTime: number;
    FileSource: 1;
    FNumber: number;
    FocalLength : number;
    FocalLengthIn35mmFormat: number;
    GPSLatitude: string;
    GPSLatitudeRef: 'North' | 'South';
    GPSLongitude: string;
    GPSLongitudeRef: 'West' | 'East';
    ImageNumber: number;
    ImageUniqueId: string;
    ISO: number;
    ISOSpeed: number;
    LensMake: string;
    LensModel: string;
    Make: string;
    Model: string;
    Notes: string;
    ReelName: string;
    SensitivityType: number;
    Software: string;
    SourceFile: string;
    SpectralSensitivity: string;
    UserComment: string;
}

type LogbookLog = Array<LogbookFrame>;

interface FileNameInfo {
    prefix: string;
    index: string;
    suffix: string;
}

async function readLogsFromDisk(filePath: string): Promise<LogbookLog> {
    const rawJson =
        await Deno.readTextFile(filePath);

    return JSON.parse(rawJson) as LogbookLog;
}

async function writeNewLogsToDisk(oldFilePath: string, exifs: LogbookLog) {
    const {dir, name, ext} = path.parse(oldFilePath);
    const newFilePath = path.join(
        dir,
        name + '_new' + ext
    );
    await Deno.writeTextFile(newFilePath, JSON.stringify(exifs));
}

function trimLastParentheses(str: string): string {
    return str.replace(/ *\([^\(]*$/g, '');
}

function cleanLensModel(exif: LogbookFrame): LogbookFrame {
    const {LensModel: lensModel} = exif;
    const standardLensModel = trimLastParentheses(lensModel);
    return {
        ...exif,
        LensModel: standardLensModel,
    };
}

function cleanCameraModel(exif: LogbookFrame): LogbookFrame {
    const {Model: cameraModel} = exif;
    const standardCameraModel = trimLastParentheses(cameraModel)
    return {
        ...exif,
        Model: standardCameraModel,
    };
}

function cleanSoftware(exif: LogbookFrame): LogbookFrame {
    return {
        ...exif,
        Software: ''
    };
}

function alignImageNumber(exifs :LogbookLog): LogbookLog {
    return exifs.map((exif, ImageNumber) => {
        return {
            ...exif,
            ImageNumber
        };
    });
}

function alignFileName(exifs: LogbookLog, zeroIndexFileName: FileNameInfo) {
    console.log(zeroIndexFileName)
    const indexStringLength = zeroIndexFileName.index.length;

    const getSourceFile = (nameInfo: FileNameInfo): string => {
        const indexStr = nameInfo.index.padStart(indexStringLength, '0');
        const sourceFilePath = `${nameInfo.prefix}${indexStr}${nameInfo.suffix}`;
        if (!existsSync(sourceFilePath)) {
            throw new Error(`Missing file ${sourceFilePath}, aborting...`);
        }
        return sourceFilePath;
    }

    return exifs.map((exif, ImageNumber) => {
        return {
            ...exif,
            SourceFile: getSourceFile(
                {
                    ...zeroIndexFileName,
                    index: String(Number(zeroIndexFileName.index) + ImageNumber)
                }
            )
        };
    });
}

function inferFilesInfo(samplePath: string): FileNameInfo {
    const extension: string = path.extname(samplePath);
    const dirname: string = path.dirname(samplePath);
    let prefix = '';

    const fileNames: string[] = [];
    for (const dirEntry of Deno.readDirSync(dirname)) {
        const fileName: string = dirEntry.name;
        if (path.extname(fileName) === extension) {
            fileNames.push(fileName);
        }
    }

    if (new Set(fileNames.map(name => name.length)).size !== 1) {
        throw new Error('Non-uniformed file names, aborting...');
    }

    for (const char of [...fileNames[0]]) {
        if (fileNames.every(
            (name: string) => name.startsWith(prefix+char)
        )) {
            prefix += char;
        } else {
            break;
        }
    }

    const baseFileName = fileNames.sort()[0];
    const baseIndex = baseFileName.slice(
        prefix.length,
        baseFileName.length - extension.length
    );

    return {
        prefix: path.join(dirname, prefix),
        index: baseIndex,
        suffix: extension,
    };
}

async function main() {
    const jsonFilePath = prompt('[Drag/Drop json file]: ').trim();
    const sampleRawFilePath = prompt('[Drag/Drop Raw file]: ').trim();
    let exifs: LogbookLog = await readLogsFromDisk(jsonFilePath);
    exifs = exifs
                .map(cleanCameraModel)
                .map(cleanSoftware)
                .map(cleanLensModel);

    exifs = alignImageNumber(exifs);

    exifs = alignFileName(
                exifs,
                inferFilesInfo(sampleRawFilePath)
    );
    console.log(exifs);

    await writeNewLogsToDisk(jsonFilePath, exifs);
}


// Learn more at https://deno.land/manual/examples/module_metadata#concepts
if (import.meta.main) {
    main();
}
