//
module.exports.reverseClut = function (clut)
{
    let reversedClut = [ ];
    for (let index = 0; index < clut.length; index++)
    {
        reversedClut.unshift (clut[index]);
    }
    return reversedClut;
};
//
module.exports.isMapping = function (mapping)
{
    let result = true;
    if (mapping && Array.isArray (mapping))
    {
        let channelCount = mapping.length;
        if (channelCount === 3)
        {
            for (let channelIndex = 0; channelIndex < channelCount; channelIndex++)
            {
                let channelMapping = mapping[channelIndex];
                if (channelMapping && Array.isArray (channelMapping))
                {
                    let componentCount = channelMapping.length;
                    if (componentCount === 256)
                    {
                        for (let componentIndex = 0; componentIndex < componentCount; componentIndex++)
                        {
                            let component = channelMapping[componentIndex];
                            if (typeof component === 'number')
                            {
                                if ((component < 0) || (component > 255))
                                {
                                    result = false;
                                }
                                else if (Math.floor (component) !== component)
                                {
                                    result = false;
                                }
                            }
                            else
                            {
                                result = false;
                            }
                            if (!result)
                            {
                                break;
                            }
                        }
                    }
                    else
                    {
                        result = false;
                    }
                }
                else
                {
                    result = false;
                }
                if (!result)
                {
                    break;
                }
            }
        }
        else
        {
            result = false;
        }
    }
    else
    {
        result = false;
    }
    return result;
};
//
module.exports.isClut = function (clut)
{
    let result = true;
    if (clut && Array.isArray (clut))
    {
        let colorCount = clut.length;
        if (colorCount === 256)
        {
            for (let colorIndex = 0; colorIndex < colorCount; colorIndex++)
            {
                let color = clut[colorIndex];
                if (color && Array.isArray (color))
                {
                    let componentCount = color.length;
                    if (componentCount === 3)
                    {
                        for (let componentIndex = 0; componentIndex < componentCount; componentIndex++)
                        {
                            let component = color[componentIndex];
                            if (typeof component === 'number')
                            {
                                if ((component < 0) || (component > 255))
                                {
                                    result = false;
                                }
                                else if (Math.floor (component) !== component)
                                {
                                    result = false;
                                }
                            }
                            else
                            {
                                result = false;
                            }
                            if (!result)
                            {
                                break;
                            }
                        }
                    }
                    else
                    {
                        result = false;
                    }
                }
                else
                {
                    result = false;
                }
                if (!result)
                {
                    break;
                }
            }
        }
        else
        {
            result = false;
        }
    }
    else
    {
        result = false;
    }
    return result;
};
//
module.exports.clutToMapping = function (clut)
{
    let redMapping = [ ];
    let greenMapping = [ ];
    let blueMapping = [ ];
    for (let index = 0; index < 256; index++)
    {
        redMapping.push (clut[index][0]);
        greenMapping.push (clut[index][1]);
        blueMapping.push (clut[index][2]);
    }
    return [ redMapping, greenMapping, blueMapping ];
};
//
module.exports.mappingToClut = function (mapping)
{
    let clut = [ ];
    let redMapping = mapping[0];
    let greenMapping = mapping[1];
    let blueMapping = mapping[2];
    for (let index = 0; index < 256; index++)
    {
        clut.push ([ redMapping[index], greenMapping[index], blueMapping[index] ]);
    }
    return clut;
};
//
