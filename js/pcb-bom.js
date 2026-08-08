(function () {
    const shell = document.querySelector('[data-bom-source]');
    if (!shell) return;

    const body = shell.querySelector('[data-bom-body]');
    const summary = document.querySelector('[data-bom-summary]');

    fetch(shell.dataset.bomSource)
        .then((response) => {
            if (!response.ok) throw new Error('BOM request failed');
            return response.json();
        })
        .then((items) => {
            let total = 0;
            items.forEach((item) => {
                total += item.quantity;
                const row = document.createElement('tr');
                [item.references, item.value, item.quantity, item.footprint].forEach((value) => {
                    const cell = document.createElement('td');
                    cell.textContent = value;
                    row.appendChild(cell);
                });
                body.appendChild(row);
            });
            if (summary) summary.textContent = `${items.length} line items and ${total} placed components.`;
        })
        .catch(() => {
            if (summary) summary.textContent = 'The BOM could not be loaded.';
            shell.classList.add('is-error');
        });
}());
