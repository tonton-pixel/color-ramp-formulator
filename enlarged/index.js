//
const { ipcRenderer } = require ('electron');
//
ipcRenderer.on
(
    'display-enlarged-svgs',
    (event, svgs) =>
    {
        while (document.body.firstChild)
        {
            document.body.firstChild.remove ();
        }
        for (svg of svgs)
        {
            let preview = document.createElement ('preview');
            preview.className = 'preview';
            preview.innerHTML = svg;
            document.body.appendChild (preview);
        }
    }
);
//
window.addEventListener ('click', (event) => { event.preventDefault (); window.close (); });
window.addEventListener ('keydown', (event) => { if (event.key === 'Escape') { event.preventDefault (); window.close (); } });
//
