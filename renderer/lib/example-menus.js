//
const { Menu, MenuItem } = require ('@electron/remote');
//
module.exports.makeMenu = function (examples, callback)
{
    let menu = new Menu ();
    for (let example of examples)
    {
        if (example === null)
        {
            menu.append (new MenuItem ({ type: 'separator' }));
        }
        else if ("string" in example)
        {
            let menuItem = new MenuItem
            (
                {
                    label: example.label.replace (/&/g, "&&"),
                    click: () => { callback (example); }
                }
            );
            menu.append (menuItem);
        }
        else if ("items" in example)
        {
            let items = example.items;
            let subMenus = [ ];
            for (let item of items)
            {
                subMenus.push
                (
                    new MenuItem
                    (
                        (item === null) ?
                        { type: 'separator' } :
                        {
                            label: item.label.replace (/&/g, "&&"),
                            click: () => { callback (item); }
                        }
                    )
                );
            }
            let menuItem = new MenuItem
            (
                {
                    label: example.label.replace (/&/g, "&&"),
                    submenu: subMenus
                }
            );
            menu.append (menuItem);
        }
    }
    return menu;
}
//
