# logbook_clean

This script cleans up [Lightme - Logbook app](https://apps.apple.com/us/app/lightme-logbook/) generated JSON files. It does a few things:

  - Cleans up Camera Model, removes the shortname
  - Cleans up Software
  - Cleans up Lens Model, removes the shortname
  - Infers the pattern of DSLR/Scanner raw file, then update the file names in the JSON record.
  
This is useful beucase:
  - Adobe Lightroom use standard Camera Model and Lens Model name for calibrating purpose;
  - [exiftool](exiftool.org) batch process exif data base on file names;
  
Intended for personal use. This scripts has absolutly no warranty.

```bash
deno run --allow-read --allow-write main.ts
```

Then drag and drop the JSON and sample DSLR filename into the prompt.
