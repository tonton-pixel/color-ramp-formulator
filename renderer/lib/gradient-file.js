//
// https://nodejs.org/api/buffer.html
//
function toUInt16BEBinaryString (number)
{
    let buffer = Buffer.allocUnsafe (Uint16Array.BYTES_PER_ELEMENT);
    buffer.writeUInt16BE (number);
    return buffer.toString ('binary');
}
//
function toInt16BEBinaryString (number)
{
    let buffer = Buffer.allocUnsafe (Int16Array.BYTES_PER_ELEMENT);
    buffer.writeInt16BE (number);
    return buffer.toString ('binary');
}
//
function toUInt32BEBinaryString (number)
{
    let buffer = Buffer.allocUnsafe (Uint32Array.BYTES_PER_ELEMENT);
    buffer.writeUInt32BE (number);
    return buffer.toString ('binary');
}
//
function toInt32BEBinaryString (number)
{
    let buffer = Buffer.allocUnsafe (Int32Array.BYTES_PER_ELEMENT);
    buffer.writeInt32BE (number);
    return buffer.toString ('binary');
}
//
function toDoubleBEBinaryString (number)
{
    let buffer = Buffer.allocUnsafe (Float64Array.BYTES_PER_ELEMENT);
    buffer.writeDoubleBE (number);
    return buffer.toString ('binary');
}
//
function toStringBEBinaryString (string)
{
    return Buffer.from (string, 'utf16le').swap16 ().toString ('binary');
}
//
// Adobe Photoshop actions file format
// https://github.com/tonton-pixel/json-photoshop-scripting/tree/master/Documentation/Photoshop-Actions-File-Format
//
function toUnicode (string)
{
    return toUInt32BEBinaryString (string.length + 1) + toStringBEBinaryString (string + '\u0000');
}
//
function toID (id, isStringID)
{
    return toUInt32BEBinaryString (isStringID ? id.length : 0) + id;
}
//
function toClass (name, id)
{
    return toUnicode (name) + toID (id);
}
//
function toKey (id)
{
    return toID (id);
}
//
function toCount (number)
{
    return toUInt32BEBinaryString (number);
}
//
function toString (string)
{
    return 'TEXT' + toUnicode (string);
}
//
function toObject (name, id)
{
    return 'Objc' + toClass (name, id);
}
//
function toList ()
{
    return 'VlLs';
}
//
function toEnum (type, value)
{
    return 'enum' + toID (type) + toID (value);
}
//
function toInteger (number)
{
    return 'long' + toInt32BEBinaryString (number);
}
//
function toDouble (number)
{
    return 'doub' + toDoubleBEBinaryString (number);
}
//
function toUnitDouble (unit, number)
{
    return 'UntF' + unit + toDoubleBEBinaryString (number);
}
//
// Adobe Photoshop gradients file format
// https://github.com/tonton-pixel/json-photoshop-scripting/tree/master/Documentation/Photoshop-Gradients-File-Format
//
module.exports.dataFromColorRamp = function (colorRamp, name)
{
    let colorStops = [ ];
    let colorStopsCount = 100;
    let interpolation = 0;  // 0 (0%) to 4096 (100%)
    for (let colorStopIndex = 0; colorStopIndex < colorStopsCount; colorStopIndex++)
    {
        let rgb = colorRamp[Math.round (colorStopIndex * 255 / (colorStopsCount - 1))];
        let colorStop =
        {
            color: { red: rgb[0], green: rgb[1], blue: rgb[2] },
            location: Math.round (colorStopIndex * 4096 / (colorStopsCount - 1)),
            midpoint: 50
        }
        colorStops.push (colorStop);
    }
    let transparencyStops =
    [
        { location: 0, midpoint: 50, opacity: 100 },
        { location: 4096, midpoint: 50, opacity: 100 }
    ];
    //
    data = [ ];
    data.push ('8BGR');
    data.push (toUInt16BEBinaryString (5));
    data.push (toUInt32BEBinaryString (16));
    data.push (toClass ("", 'null'));
    data.push (toCount (1));
    data.push (toKey ('GrdL'));
    data.push (toList ());
    data.push (toCount (1));
    data.push (toObject ("Gradient", 'Grdn'));
    data.push (toCount (1));
    data.push (toKey ('Grad'));
    data.push (toObject ("Gradient", 'Grdn'));
    data.push (toCount (5));
    data.push (toKey ('Nm  '));
    data.push (toString (name));
    data.push (toKey ('GrdF'));
    data.push (toEnum ('GrdF', 'CstS'));
    data.push (toKey ('Intr'));
    data.push (toDouble (interpolation));
    data.push (toKey ('Clrs'));
    data.push (toList ());
    data.push (toCount (colorStops.length));
    for (let colorStop of colorStops)
    {
        data.push (toObject ("", 'Clrt'));
        data.push (toCount (4));
        data.push (toKey ('Clr '));
        data.push (toObject ("", 'RGBC'));
        data.push (toCount (3));
        data.push (toKey ('Rd  '));
        data.push (toDouble (colorStop.color.red));
        data.push (toKey ('Grn '));
        data.push (toDouble (colorStop.color.green));
        data.push (toKey ('Bl  '));
        data.push (toDouble (colorStop.color.blue));
        data.push (toKey ('Type'));
        data.push (toEnum ('Clry', 'UsrS'));
        data.push (toKey ('Lctn'));
        data.push (toInteger (colorStop.location));
        data.push (toKey ('Mdpn'));
        data.push (toInteger (colorStop.midpoint));
    }
    data.push (toKey ('Trns'));
    data.push (toList ());
    data.push (toCount (transparencyStops.length));
    for (let transparencyStop of transparencyStops)
    {
        data.push (toObject ("", 'TrnS'));
        data.push (toCount (3));
        data.push (toKey ('Opct'));
        data.push (toUnitDouble ('#Prc', transparencyStop.opacity));
        data.push (toKey ('Lctn'));
        data.push (toInteger (transparencyStop.location));
        data.push (toKey ('Mdpn'));
        data.push (toInteger (transparencyStop.midpoint));
    }
    return data.join ("");
}
//
