Object.assign = function (target, varArgs) {
  "use strict";
  if (target == null)
    throw new TypeError("Cannot convert undefined or null to object");
  var to = Object(target);
  for (var index = 1; index < arguments.length; index++) {
    var nextSource = arguments[index];
    if (nextSource != null)
      for (var nextKey in nextSource)
        if (Object.prototype.hasOwnProperty.call(nextSource, nextKey))
          to[nextKey] = nextSource[nextKey];
  }
  return to;
};
Array.isArray = function (arg) {
  return Object.prototype.toString.call(arg) === "[object Array]";
};
Array.prototype.findIndex = function (callback) {
  for (var i = 0; i < this.length; i++)
    if (callback(this[i], i, this)) return i;
  return null;
};
Array.prototype.filter = function (callback) {
  var filtered = [];
  for (var i = 0; i < this.length; i++)
    if (callback(this[i], i, this)) filtered.push(this[i]);
  return filtered;
};
Array.prototype.map = function (callback) {
  var mappedParam = [];
  for (var i = 0; i < this.length; i++)
    mappedParam.push(callback(this[i], i, this));
  return mappedParam;
};
RGBColor.prototype.create = function (red, green, blue) {
  this.red = red;
  this.green = green;
  this.blue = blue;
  return this;
};

// Since Illustrator strangely doesn't include BMP exporting in the API, we have to emulate it via dynamic action
function exportBMP32(options) {
  function toHex(input) {
    var output = "";
    for (var i = 0; i < input.toString().length; i++)
      output += input.toString().charCodeAt(i).toString(16);
    return output;
  }
  function encodeFilePath(path) {
    var hex = toHex(path);
    return "[ " + hex.length / 2 + " " + hex + "]";
  }
  var temp = File(options.BMP.actionPath);
  temp.open("w");
  var actionString =
    "/version 3 /name [ 9 4578706f7274424d50 ] /isOpen 1 /actionCount 1 /action-1 { /name [ 8 6578706f72743332 ] /keyIndex 0 /colorIndex 0 /isOpen 1 /eventCount 1 /event-1 { /useRulersIn1stQuadrant 0 /internalName (adobe_exportDocument) /localizedName [ 9 4578706f7274204173 ] /isOpen 0 /isOn 1 /hasDialog 1 /showDialog 0 /parameterCount 13 /parameter-1 { /key 1684108385 /showInPalette 0 /type (raw) /value < 49 00000001506c746600002000506c746657696e20427444700000200042744470 42443332436d707200000000626f6f6c00 > /size 49 } /parameter-2 { /key 1349284966 /showInPalette -1 /type (enumerated) /name [ 7 57696e646f7773 ] /value 1466527264 } /parameter-3 { /key 1114915952 /showInPalette -1 /type (enumerated) /name [ 2 3332 ] /value 1111765810 } /parameter-4 { /key 1131245682 /showInPalette -1 /type (boolean) /value 0 } /parameter-5 { /key 1920235888 /showInPalette -1 /type (enumerated) /name [ 3 524742 ] /value 0 } /parameter-6 { /key 1919251310 /showInPalette -1 /type (real) /value 72.0 } /parameter-7 { /key 1633774707 /showInPalette -1 /type (boolean) /value 1 } /parameter-8 { /key 1851878757 /showInPalette -1 /type (ustring) /value " +
    encodeFilePath(File(options.BMP.imagePath).fsName) +
    " } /parameter-9 { /key 1718775156 /showInPalette -1 /type (ustring) /value [ 3 424d50 ] } /parameter-10 { /key 1702392942 /showInPalette -1 /type (ustring) /value [ 3 424d50 ] } /parameter-11 { /key 1936548194 /showInPalette -1 /type (boolean) /value 0 } /parameter-12 { /key 1935764588 /showInPalette -1 /type (boolean) /value 1 } /parameter-13 { /key 1936875886 /showInPalette -1 /type (ustring) /value [ 1 31 ] } } } ";
  temp.write(actionString);
  temp.close();
  app.loadAction(temp);
  app.doScript("export32", "ExportBMP", false);
  app.unloadAction("ExportBMP", "");
  if (options.BMP.deleteAction) temp.remove();
}

function getBinaryFromTempFile(options) {
  var file = File(options.BMP.imagePath);
  file.open("r");
  file.encoding = "BINARY";
  var data = [];
  while (!file.eof) data.push(file.readch().charCodeAt(0));
  file.close();
  if (options.BMP.deleteImage) file.remove();
  return data;
}

function parseBitmap(binaryData, pixels, options) {
  pixels = pixels || null;
  function hasInvalidCoordinate(list, index, max) {
    var invalid = list.find(function (pixel) {
      return pixel[index] > max;
    });
    return !!invalid;
  }
  function createCoordinateError(list, param, max) {
    var index = param == "X" ? 0 : 1,
      params = ["width", "height"];
    var errString =
      "Invalid " +
      param +
      " coordinate: " +
      list.find(function (pixel) {
        return pixel[index] > max;
      })[index] +
      " is greater than total " +
      params[index] +
      " of " +
      max +
      ".\r\n\r\nPixelData is 0-based so first pixels have coordinates of 0, not 1.";
    return alert(errString);
  }
  function getByte(data, index, length) {
    var result = 0;
    for (var i = 0; i < length; i++)
      result += i ? data[index + i] << [0, 8, 16, 24][i] : data[index + i];
    return result;
  }
  var isAllPixels = pixels === null;
  if (binaryData[0] !== 0x42 || binaryData[1] !== 0x4d) {
    alert("Invalid BMP format");
    return null;
  }
  var pixelOffset = getByte(binaryData, 10, 4),
    width = getByte(binaryData, 18, 4),
    height = getByte(binaryData, 22, 4),
    bitDepth = getByte(binaryData, 28, 2),
    bytesPerPixel = bitDepth / 8,
    pixelData;
  if (!isAllPixels) {
    pixels = !Array.isArray(pixels[0]) ? [pixels] : pixels;
    pixelData = new Array(pixels.length);
    if (hasInvalidCoordinate(pixels, 0, width)) {
      createCoordinateError(pixels, "X", width);
      return null;
    } else if (hasInvalidCoordinate(pixels, 1, height)) {
      createCoordinateError(pixels, "Y", height);
      return null;
    }
    for (var i = 0; i < pixelData.length; i++) {
      var offset =
        (pixels[i][0] +
          Math.abs(Math.abs(pixels[i][1]) - (height - 1)) * width) *
          bytesPerPixel +
        pixelOffset;
      pixelData[i] = {
        r: binaryData[offset + 2],
        g: binaryData[offset + 1],
        b: binaryData[offset],
        a: binaryData[offset + 3], // Doesn't seem to be working...?
      };
    }
    return options.verbose
      ? {
          width: width,
          height: height,
          bpp: bytesPerPixel,
          bitDepth: bitDepth,
          pixelData: pixelData,
        }
      : pixelData;
  } else {
    pixelData = new Array(width * height);
    for (var i = 0; i < pixelData.length; i++) {
      var offset = pixelOffset + i * bytesPerPixel;
      pixelData[i] = {
        r: binaryData[offset + 2],
        g: binaryData[offset + 1],
        b: binaryData[offset],
        a: binaryData[offset + 3],
        x: i % width,
        y: Math.floor(i / width),
      };
    }
    return options.verbose
      ? {
          width: width,
          height: height,
          bpp: bytesPerPixel,
          bitDepth: bitDepth,
          pixelData: pixelData,
        }
      : pixelData;
  }
}
function writeFile(path, data, encoding) {
  var tmp = File(path);
  tmp.encoding = encoding || "UTF8";
  tmp.open("w");
  tmp.write(data);
  tmp.close();
}

function getPixelColor(pixels, options) {
  options = options || null;
  options = Object.assign(
    {
      // Function called at the very end of execution
      onComplete: null,
      // Function to modify binary data before parsing begins
      onBeforeParse: null,
      // Function to return parsed binary rawdata
      onAfterParse: null,
      BMP: {
        // File location of temporary image
        imagePath: Folder.userData + "/pixelGetColor.BMP",
        // Whether image is automatically deleted after use
        deleteImage: true,
        // File location of temporary action
        actionPath: Folder.userData + "/exportBMP.aia",
        // Whether action is automatically deleted after use
        deleteAction: true,
      },
      // Whether to return as native RGBColor or if false, as JSON
      returnColor: true,
      // Whether to return from parsing containing metadata about file such as width and height
      verbose: false,
      // Whether to remove duplicate colors
      removeDuplicates: true,
      // Whether to, if only one color is found, return the color directly instead of a 1-length array
      flattenResults: true,
    },
    options
  );
  exportBMP32(options);
  var binaryData = getBinaryFromTempFile(options);
  if (options.onBeforeParse && options.onBeforeParse instanceof Function)
    binaryData = options.onBeforeParse(binaryData) || binaryData;
  var parsed = parseBitmap(binaryData, pixels, options);
  if (options.onAfterParse && options.onAfterParse instanceof Function)
    options.onAfterParse(parsed);
  var pixelData = options.verbose ? parsed.pixelData : parsed;
  var result = options.returnColor
    ? pixelData.map(function (pixel) {
        return new RGBColor().create(pixel.r, pixel.g, pixel.b);
      })
    : parsed;
  result = options.removeDuplicates
    ? result.filter(function (color, index) {
        return (
          result.findIndex(function (c) {
            return c == color;
          }) !== index
        );
      })
    : result;
  result =
    pixels.length == 1 || (options.flattenResults && result.length == 1)
      ? result[0]
      : result;
  if (options.onComplete && options.onComplete instanceof Function)
    options.onComplete(result);
}

getPixelColor([[0, 1]], {
  onAfterParse: function (result) {
    alert(result);
    writeFile(
      "C:/Users/TRSch/OneDrive/Documents/Adobe Scripts/ILST - GetRGBFromBMP/sandbox/result.json",
      JSON.stringify(result)
    );
  },
});
