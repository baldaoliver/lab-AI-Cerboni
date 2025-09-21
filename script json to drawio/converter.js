function convertToDrawio() {
  let input = document.getElementById('jsonInput').value;
  try {
    const data = JSON.parse(input);

    // --- Step 1: Build adjacency maps ---
    const incoming = {};
    const outgoing = {};
    data.nodi.forEach(node => { incoming[node.id] = []; outgoing[node.id] = []; });
    data.archi.forEach(edge => {
      incoming[edge.arrivo].push(edge.partenza);
      outgoing[edge.partenza].push(edge.arrivo);
    });

    // --- Step 2: Assign levels (top-down hierarchy) ---
    const levels = {};
    data.nodi.forEach(node => { levels[node.id] = incoming[node.id].length === 0 ? 0 : -1; });

    let changed = true;
    while (changed) {
      changed = false;
      data.nodi.forEach(node => {
        if (levels[node.id] === -1) {
          const parentLevels = incoming[node.id].map(p => levels[p]);
          if (parentLevels.every(l => l >= 0)) {
            levels[node.id] = parentLevels.length > 0 ? Math.max(...parentLevels) + 1 : 0;
            changed = true;
          }
        }
      });
    }

    // --- Step 3: Group nodes by level ---
    const nodesPerLevel = {};
    data.nodi.forEach(node => {
      const level = levels[node.id];
      if (!nodesPerLevel[level]) nodesPerLevel[level] = [];
      nodesPerLevel[level].push(node);
    });

    // --- Step 4: Assign coordinates with multi-layer logic ---
    const spacingX = 300; // increased horizontal spacing
    const spacingY = 250; // increased vertical spacing
    const subLayerSpacingY = 150;
    const maxNodesPerRow = 5;

    data.nodi.forEach(node => {
      const level = levels[node.id];
      const nodesInLevel = nodesPerLevel[level];
      const subLayerIndex = Math.floor(nodesInLevel.indexOf(node) / maxNodesPerRow);
      const indexInSubLayer = nodesInLevel.indexOf(node) % maxNodesPerRow;

      const nodesInThisSubLayer = Math.min(maxNodesPerRow, nodesInLevel.length - subLayerIndex * maxNodesPerRow);
      node.x = indexInSubLayer * spacingX - ((nodesInThisSubLayer - 1) * spacingX) / 2;
      node.y = level * spacingY + subLayerIndex * subLayerSpacingY;
      node.width = node.width || 140;
      node.height = node.height || 60;
      node.color = node.color || "#FFFFFF";
      node.textColor = node.textColor || "#000000";
      node.xmlId = "node_" + node.id;
    });

    // --- Step 5: Start XML ---
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net">
  <diagram name="Concept Map">
    <mxGraphModel dx="1000" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />`;

    // --- Step 6: Add nodes with whiteSpace=wrap ---
    data.nodi.forEach(node => {
      xml += `
        <mxCell id="${node.xmlId}" value="${node.etichetta}" style="shape=rectangle;fillColor=${node.color};strokeColor=#000000;fontColor=${node.textColor};whiteSpace=wrap;" vertex="1" parent="1">
          <mxGeometry x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" as="geometry" />
        </mxCell>`;
    });

    // --- Step 7: Add edges ---
    let edgeCounter = 1000;
    data.archi.forEach(edge => {
      const sourceId = data.nodi.find(n => n.id == edge.partenza).xmlId;
      const targetId = data.nodi.find(n => n.id == edge.arrivo).xmlId;
      const edgeId = "edge_" + edgeCounter++;
      xml += `
        <mxCell id="${edgeId}" edge="1" parent="1" source="${sourceId}" target="${targetId}" value="${edge.etichetta}" style="endArrow=block;strokeColor=#000000;fontColor=#000000;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>`;
    });

    // --- Step 8: Close XML ---
    xml += `
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

    // --- Step 9: Trigger download ---
    const blob = new Blob([xml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'concept_map.drawio';
    a.click();
    URL.revokeObjectURL(url);

  } catch (e) {
    alert('JSON non valido: ' + e.message);
  }
}
