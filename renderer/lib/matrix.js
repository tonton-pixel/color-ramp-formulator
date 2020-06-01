//
function scalarMultiply (s, v)
{
    var result = [ ];
    for (var i = 0; i < v.length; i++)
    {
        result[i] = s * v[i];
    }
    return result;
}
//
function multiply (m1, m2)
{
    if (m1[0].length !== m2.length) // (m1.width !== m2.height)
    {
        throw new Error ("matrix.multiply: incompatible sizes");
    }
    else
    {
        var result = [ ];
        for (var i = 0; i < m1.length; i++) // m1.height
        {
            result[i] = [ ];
            for (var j = 0; j < m2[0].length; j++)  // m2.width
            {
                var sum = 0;
                for (var k = 0; k < m2.length; k++) // m2.height
                {
                    sum += m1[i][k] * m2[k][j];
                }
                result[i][j] = sum;
            }
        }
        return result;
    }
}
//
function fromVector (v)
{
    var m = [ ];
    for (var i = 0; i < v.length; i++)
    {
        if (typeof v[i] !== 'number')
        {
            throw new Error ("matrix.fromVector: not a vector");
        }
        else
        {
            m.push ([ v[i] ]);
        }
    }
    return m;
}
//
function toVector (m)
{
    var v = [ ];
    for (var i = 0; i < m.length; i++)
    {
        if (m[i].length !== 1)
        {
            throw new Error ("matrix.toVector: not a vector");
        }
        else
        {
            v.push (m[i][0]);
        }
    }
    return v;
}
//
module.exports =
{
    fromVector,
    multiply,
    scalarMultiply,
    toVector
};
//
