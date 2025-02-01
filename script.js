document.addEventListener("DOMContentLoaded", function () {
  // --------------------------------------------------
  // 1) Setup for dynamic “Extra Product” row expansion
  // --------------------------------------------------
  let extraRows = [];             // holds all .product-row elements in .extra-products-grid
  let usedExtraRowsCount = 0;     // how many are already filled

  // Attach an event listener to an extra row so that when its "article" input is changed
  // and is non-empty, if it is the last row, we add two more fields.
  function attachExtraRowListener(row) {
    const articleInput = row.querySelector('input[name="article"]');
    if (articleInput) {
      articleInput.addEventListener('change', function () {
        // When the user types in the article field, check if it is not empty.
        if (articleInput.value.trim() !== "") {
          // If this row is the last in extraRows, then add two more.
          if (row === extraRows[extraRows.length - 1]) {
            console.log("Last extra row filled manually; adding two more fields");
            addTwoMoreFields();
          }
        }
      });
    }
  }

  function initExtraRows() {
    // Convert NodeList -> Array so we can index them easily
    extraRows = Array.from(document.querySelectorAll(".extra-products-grid .product-row"));
    usedExtraRowsCount = 0;
    console.log("initExtraRows() called. Extra rows available:", extraRows.length);
    // Attach event listeners to each existing row.
    extraRows.forEach((row) => {
      attachExtraRowListener(row);
    });
  }

  // Adds 2 new columns (each with 1 .product-row) to .extra-products-grid
  // and pushes them into extraRows. So each call extends extraRows by 2.
  function addTwoMoreFields() {
    const grid = document.querySelector(".extra-products-grid");
    console.log("addTwoMoreFields() called. Extra rows count before adding:", extraRows.length);

    for (let i = 0; i < 2; i++) {
      const col = document.createElement("div");
      col.className = "product-column";

      const row = document.createElement("div");
      row.className = "product-row";

      // Create the 3 inputs
      const inputCode = document.createElement("input");
      inputCode.type = "text";
      inputCode.placeholder = "Artikelcode";
      inputCode.name = "article";

      const inputDesc = document.createElement("input");
      inputDesc.type = "text";
      inputDesc.placeholder = "Beschrijving";
      inputDesc.name = "description";

      const inputQty = document.createElement("input");
      inputQty.type = "text";
      inputQty.placeholder = "Aantal";
      inputQty.name = "quantity";

      // Append inputs into the row
      row.appendChild(inputCode);
      row.appendChild(inputDesc);
      row.appendChild(inputQty);

      // Attach our event listener to this newly created row
      attachExtraRowListener(row);

      // Put row into column, column into grid
      col.appendChild(row);
      grid.appendChild(col);

      // Also push this row onto our global list
      extraRows.push(row);
    }
    console.log("New extra rows added. Extra rows count now:", extraRows.length);
  }

  // Initialize the array of extra rows once DOM is ready
  initExtraRows();


  // --------------------------------------------------
  // 2) Button logic: on click => get data => fill fields
  // --------------------------------------------------
  const loadDataButton = document.getElementById("LoadData");

  loadDataButton.addEventListener("click", function () {
	  // Get today's date and format it as dd-mm-yyyy
	  const today = new Date();
	  const dd = String(today.getDate()).padStart(2, '0');
	  const mm = String(today.getMonth() + 1).padStart(2, '0'); // getMonth() is zero-based
	  const yyyy = today.getFullYear();
	  const formattedDate = `${dd}-${mm}-${yyyy}`;
	  
	  // Update all signature date labels
	  const signatureDateLabels = document.querySelectorAll(".signature-date label");
	  signatureDateLabels.forEach(label => {
		label.textContent = formattedDate;
	  });
    chrome.runtime.sendMessage(
      "fjgodpiekafafncggbbagckcmgjnnbmk",
      { type: "getExtractedData" },
      function (response) {
        console.log("Data received:", response);

        // Doucheset references
        const dsCode  = document.getElementById("doucheset-code");
        const dsType  = document.getElementById("doucheset-type");
        const dsKleur = document.getElementById("doucheset-kleur");

        // === Fill Client Name ===
        if (response && response.clientName) {
		  let actualClientName = typeof response.clientName === "object" 
			  ? response.clientName.clientName 
			  : response.clientName;
		  
		  const nameInputs = document.querySelectorAll(".input-group .client-name + input");
		  nameInputs.forEach((inp) => {
			inp.value = actualClientName;
		  });
		  console.log("Client name set:", actualClientName);
		}

		// === Fill Collection Name ===
		if (response && response.clientName && response.clientName.collectionName) {
		  let actualCollectionName = response.clientName.collectionName;
		  
		  // Select all inputs that immediately follow a label with class "collectienaam"
		  const collectionInputs = document.querySelectorAll("label.collectienaam + input");
		  collectionInputs.forEach(inp => {
			inp.value = actualCollectionName;
		  });
		  console.log("Collection name set:", actualCollectionName);
		}



        // A map to rename certain items
        const replacementMap = {
          "Acrylplaat 5mm 200x100cm": "Acryl 2m",
          "Acrylplaat 5mm 300x100cm": "Acryl 3m",
          "Kömastyle Deco": "Smart Panels",
          "Wall Style": "Wall Style",
        };

        let usedItems = new Set(); // track which codes we've processed

        // -------------------------------------
		// 2.1 Douchevloer
		// -------------------------------------
		if (response && response.data) {
		  const douchevloerDesc = document.getElementById("douchevloer-description");
		  if (douchevloerDesc) {
			const floorList = [
			  "Smartstone Style",
			  "Polymer C",
			  "Polymer S",
			  "Polymer R",
			  "Aqua Stone",
			  "Smartstone Evo",
			];
			for (let item of response.data) {
			  const found = floorList.find((f) =>
				item.description.toLowerCase().includes(f.toLowerCase().trim())
			  );
			  if (found && !usedItems.has(item.code)) {
				console.log("Douchevloer match:", found);
				douchevloerDesc.value = found;

				// Code
				const floorCode = document.getElementById("douchevloer-code");
				if (floorCode) {
				  const cMatch = item.code.match(/\d{3}\.\d{4}\.\d{2}[A-Za-z]{2}/);
				  if (cMatch) {
					floorCode.value = cMatch[0];
					console.log("Douchevloer code:", cMatch[0]);
				  }
				}

				// Size
				const floorMaat = document.getElementById("douchevloer-maat");
				if (floorMaat) {
				  // First, try to detect a pattern like "180x80cm"
				  const dimsMatch = item.description.match(/(\d+)[xX](\d+)cm/i);
				  if (dimsMatch) {
					const width = parseInt(dimsMatch[1], 10);
					const height = parseInt(dimsMatch[2], 10);
					// Multiply each dimension by 10.
					floorMaat.value = `${width * 10}x${height * 10}`;
					console.log("Douchevloer dimensions (pattern):", floorMaat.value);
				  } else {
					// Fallback: look for a single dimension (e.g., "80cm") and use default second dimension
					const cmMatch = item.description.match(/(\d+)cm/i);
					if (cmMatch) {
					  const num = parseInt(cmMatch[1], 10);
					  floorMaat.value = `${num * 10}x2000`;
					  console.log("Douchevloer size (fallback):", floorMaat.value);
					} else {
					  const noCm = item.description.match(/(\d+x\d+)/i);
					  if (noCm) {
						floorMaat.value = noCm[1];
						console.log("Douchevloer size (no cm fallback):", noCm[1]);
					  }
					}
				  }
				}

				// Color
				const floorColor = document.getElementById("douchevloer-kleur");
				if (floorColor) {
				  const preColors = ["wit", "antraciet", "antracietgrijs", "steengrijs", "grijs", "zwart", "zand"];
				  const matchedCol = preColors.find((c) =>
					item.description.toLowerCase().includes(c)
				  );
				  if (matchedCol) {
					floorColor.value = matchedCol;
					console.log("Douchevloer color:", matchedCol);
				  } else {
					const genColor = item.description.match(/(wit|zwart|rood|blauw|groen|geel|grijs|bruin|beige|oranje)/i);
					if (genColor) {
					  floorColor.value = genColor[0].toLowerCase();
					  console.log("Douchevloer color from desc:", floorColor.value);
					}
				  }
				}

				usedItems.add(item.code);
				break;
			  }
			}
		  }
		}


        // -------------------------------------
        // 2.2 Douchewand (main + extra)
        // -------------------------------------
        if (response && response.data) {
          const wandDesc = document.getElementById("douchewand-description");
          if (wandDesc) {
            const wandList = [
              "Acrylplaat 5mm 200x100cm",
              "Acryl 2m",
              "Acrylplaat 5mm 300x100cm",
              "Acryl 3m",
              "Kömastyle Deco",
              "Smart Panels",
              "Wall Style",
            ];

            // === Main wand
            for (let item of response.data) {
              const found = wandList.find((w) =>
                item.description.toLowerCase().includes(w.toLowerCase().trim())
              );
              if (found && !usedItems.has(item.code)) {
                console.log("Douchewand match:", found);
                wandDesc.value = replacementMap[found] || found;

                // Code
                const wandCode = document.getElementById("douchewand-code");
                if (wandCode) {
                  const codeMatch = item.code.match(/\d{3}\.\d{4}\.\d{2}[A-Za-z]{2}/);
                  if (codeMatch) {
                    wandCode.value = codeMatch[0];
                    console.log("Douchewand code:", codeMatch[0]);
                  }
                }

                // Color
                const wandColor = document.getElementById("douchewand-kleur");
                if (wandColor) {
                  let cDesc = item.description.toLowerCase().replace("carbon/zwart", "zwart");
                  const preCol = [
                    "wit","zwart","karbon","blauw","donkerblauw","burgundy","rood","donkerrood",
                    "geel","groen","mokka","titanium","grijs","vanille","bordeaux","antraciet",
                    "zand","antracietgrijs","steengrijs","light oak","white stone","concrete grey","stone grey"
                  ];
                  let mCol = preCol.find((co) => cDesc.includes(co));
                  if (mCol) {
                    wandColor.value = mCol;
                    console.log("Douchewand color:", mCol);
                  } else {
                    const genMatch = item.description.match(/(wit|zwart|rood|blauw|groen|geel|grijs|bruin|beige|oranje)/i);
                    if (genMatch) {
                      wandColor.value = genMatch[0].toLowerCase();
                      console.log("Douchewand color from desc:", wandColor.value);
                    }
                  }
                }

                // Amount
                const wandAmt = document.getElementById("douchewand-aantal");
                if (wandAmt) {
                  wandAmt.value = item.amount;
                  console.log("Douchewand amount:", item.amount);
                }

                usedItems.add(item.code);
                break;
              }
            }

            // === Extra products in the same wandList
            for (let item of response.data) {
              const found = wandList.find((w) =>
                item.description.toLowerCase().includes(w.toLowerCase().trim())
              );
              if (found && !usedItems.has(item.code)) {
                // Use global extraRows and usedExtraRowsCount
                if (usedExtraRowsCount >= extraRows.length) {
                  console.log("Not enough extra rows. usedExtraRowsCount:", usedExtraRowsCount, "Extra rows:", extraRows.length);
                  addTwoMoreFields();
                }
                console.log("Using extra row index:", usedExtraRowsCount, "for item code:", item.code);
                const row = extraRows[usedExtraRowsCount];
                usedExtraRowsCount++;

                let cDesc = item.description.toLowerCase().replace("carbon/zwart", "zwart");
                const cRegex = /(wit|zwart|karbon|blauw|donkerblauw|burgundy|rood|donkerrood|geel|groen|mokka|titanium|grijs|vanille|bordeaux|antraciet|zand|antracietgrijs|steengrijs|light oak|white stone|concrete grey|stone grey)/i;
                let cMatch = cDesc.match(cRegex);
                let color = cMatch ? cMatch[0].toLowerCase() : "chroom";
                const base = replacementMap[found] || found;
                const formatted = `${base} - ${color}`;

                row.querySelector('input[name="article"]').value = item.code;
                row.querySelector('input[name="description"]').value = formatted;
                row.querySelector('input[name="quantity"]').value = item.amount;
                console.log("Extra product filled:", formatted);

                usedItems.add(item.code);
              }
            }
          }

          // -------------------------------------
          // 2.3 Glas lange zijde (and nested logic)
          // -------------------------------------
          const gLDesc  = document.getElementById("glas-lange-description");
          const gLCode  = document.getElementById("glas-lange-code");
          const gLMaat  = document.getElementById("glas-lange-maat");
          const gLKleur = document.getElementById("glas-lange-kleur");

          if (gLDesc && gLCode && gLMaat && gLKleur) {
            for (let item of response.data) {
              // KineStyle Solo
              if (item.description.includes("KineStyle Solo") && !usedItems.has(item.code)) {
                console.log("Glas-lange: KineStyle Solo");
                gLDesc.value = "KineStyle Solo";
                gLCode.value = item.code;
                const m = item.description.match(/(\d+)cm/i);
                if (m) {
                  const num = parseInt(m[1]);
                  gLMaat.value = `${num * 10}x2000`;
                  console.log("KineStyle Solo size:", gLMaat.value);
                }
                gLKleur.value = "chroom";
                console.log("KineStyle Solo color: chroom");
                usedItems.add(item.code);
                continue;
              }

              // === SmartDesign Solo S(+F) (Glas-lange) ===
              if (
                /^250\.3110\.(0\d)(NB|WH)$/i.test(item.code) &&
                item.description.toLowerCase().includes("solo s(+f)") &&
                !usedItems.has(item.code)
              ) {
                console.log("Glas-lange: SmartDesign Solo S(+F)");

                gLDesc.value = "Smartdesign S (+F)";
                gLCode.value = item.code;

                const match = item.code.match(/^250\.3110\.(0\d)(NB|WH)$/i);
                if (match) {
                  const sizeDigit = match[1];
                  const suffix = match[2].toUpperCase();
                  let rawSize = 0;
                  switch (sizeDigit) {
                    case "01": rawSize = 70;  break;
                    case "02": rawSize = 75;  break;
                    case "03": rawSize = 80;  break;
                    case "04": rawSize = 85;  break;
                    case "05": rawSize = 90;  break;
                    case "06": rawSize = 95;  break;
                    case "07": rawSize = 100; break;
                    default:
                      console.log("Unknown size digit for SmartDesign S(+F):", sizeDigit);
                  }
                  if (rawSize) {
                    gLMaat.value = `${rawSize * 10}x2005`;
                    console.log("SmartDesign S(+F) size:", gLMaat.value);
                  } else {
                    gLMaat.value = "???x2005";
                  }
                  let color = "chroom";
                  switch (suffix) {
                    case "NB": color = "chroom"; break;
                    case "WH": color = "wit";    break;
                  }
                  gLKleur.value = color;
                  console.log("SmartDesign S(+F) color:", color);
                }
                usedItems.add(item.code);
                continue;
              }

              // === SmartDesign S (Glas-lange) ===
              if (
                /^250\.3010\.(0\d)(NB|WH)$/i.test(item.code) &&
                item.description.toLowerCase().includes("smartdesign s") &&
                !usedItems.has(item.code)
              ) {
                console.log("Glas-lange: SmartDesign S");

                gLDesc.value = "SmartDesign S";
                gLCode.value = item.code;

                const match = item.code.match(/^250\.3010\.(0\d)(NB|WH)$/i);
                if (match) {
                  const sizeDigit = match[1];
                  const suffix = match[2].toUpperCase();
                  let rawSize = 0;
                  switch (sizeDigit) {
                    case "01": rawSize = 70;  break;
                    case "02": rawSize = 75;  break;
                    case "03": rawSize = 80;  break;
                    case "04": rawSize = 85;  break;
                    case "05": rawSize = 90;  break;
                    case "06": rawSize = 95;  break;
                    case "07": rawSize = 100; break;
                    default:
                      console.log("Unknown SmartDesign S size digit:", sizeDigit);
                  }
                  if (rawSize) {
                    gLMaat.value = `${rawSize * 10}x2005`;
                    console.log("SmartDesign S size:", gLMaat.value);
                  } else {
                    gLMaat.value = "???x2005";
                  }
                  let color = "chroom";
                  switch (suffix) {
                    case "NB": color = "chroom"; break;
                    case "WH": color = "wit";    break;
                  }
                  gLKleur.value = color;
                  console.log("SmartDesign S color:", color);
                }
                usedItems.add(item.code);
                continue;
              }

              // === SmartDesign 3C(+F2) LH => final desc: "SmartDesign 3C deur R"
              if (
                item.code.toLowerCase().startsWith("250.2311.") &&
                item.description.toLowerCase().includes("3c") &&
                item.description.toLowerCase().includes("lh") &&
                !usedItems.has(item.code)
              ) {
                console.log("Glas-lange: SmartDesign 3C(+F2) LH => final desc: SmartDesign 3C deur R");

                gLDesc.value = "SmartDesign 3C deur R";
                gLCode.value = item.code;

                const match = item.code.match(/^250\.2311\.(\d{2})(NB|WH)$/i);
                if (match) {
                  const sizeDigits = match[1];
                  const suffix = match[2].toUpperCase();
                  let rawSize = 0;
                  switch (sizeDigits) {
                    case "01": rawSize = 80;  break;
                    case "02": rawSize = 85;  break;
                    case "03": rawSize = 90;  break;
                    case "04": rawSize = 95;  break;
                    case "05": rawSize = 100; break;
                    case "06": rawSize = 110; break;
                    case "07": rawSize = 120; break;
                    case "08": rawSize = 130; break;
                    case "09": rawSize = 140; break;
                    default:
                      console.log("Unknown digits for SmartDesign 3C(+F2):", sizeDigits);
                  }
                  if (rawSize) {
                    const firstPart = rawSize * 10 - 30;
                    const secondPart = rawSize * 10;
                    gLMaat.value = `${firstPart}/${secondPart}x2005`;
                    console.log("SmartDesign 3C F2 size:", gLMaat.value);
                  } else {
                    gLMaat.value = "???x2005";
                  }
                  let color = "chroom";
                  switch (suffix) {
                    case "NB": color = "chroom"; break;
                    case "WH": color = "wit";    break;
                  }
                  gLKleur.value = color;
                  console.log("SmartDesign 3C F2 color:", color);
                } else {
                  gLMaat.value  = "???x2005";
                  gLKleur.value = "chroom";
                }
                usedItems.add(item.code);
                continue;
              }

              // === SmartDesign C+F deur L ===
              if (
                item.code.toLowerCase().startsWith("250.2012.") &&
                item.description.toLowerCase().includes("c+f2") &&
                item.description.toLowerCase().includes("l") &&
                !usedItems.has(item.code)
              ) {
                console.log("Glas-lange: SmartDesign C+F deur L");

                gLDesc.value = "SmartDesign C+F deur L";
                gLCode.value = item.code;

                const match = item.code.match(/^250\.2012\.(\d{2})(NB|WH|BL)$/i);
                if (match) {
                  const sizeDigits = match[1];
                  const suffix = match[2].toUpperCase();
                  let rawSize = 0;
                  switch (sizeDigits) {
                    case "01": rawSize = 90;  break;
                    case "02": rawSize = 95;  break;
                    case "03": rawSize = 100; break;
                    case "04": rawSize = 110; break;
                    case "05": rawSize = 120; break;
                    case "06": rawSize = 130; break;
                    case "07": rawSize = 140; break;
                    case "08": rawSize = 150; break;
                    case "09": rawSize = 160; break;
                    case "10": rawSize = 170; break;
                    case "11": rawSize = 180; break;
                    default:
                      console.log("Unknown digits for SmartDesign C+F deur L:", sizeDigits);
                  }
                  if (rawSize) {
                    const firstPart = rawSize * 10 - 30;
                    const secondPart = rawSize * 10;
                    gLMaat.value = `${firstPart}/${secondPart}x2005`;
                    console.log("SmartDesign C+F deur L size:", gLMaat.value);
                  } else {
                    gLMaat.value = "???x2005";
                  }
                  let color = "chroom";
                  switch (suffix) {
                    case "NB": color = "chroom"; break;
                    case "WH": color = "wit";    break;
                    case "BL": color = "zwart";  break;
                  }
                  gLKleur.value = color;
                  console.log("SmartDesign C+F deur L color:", color);
                } else {
                  gLMaat.value = "???x2005";
                  gLKleur.value = "chroom";
                }
                usedItems.add(item.code);
                continue;
              }

              // === SmartDesign C+F deur R ===
              if (
                item.code.toLowerCase().startsWith("250.2011.") &&
                item.description.toLowerCase().includes("c+f") &&
                item.description.toLowerCase().includes("r") &&
                !usedItems.has(item.code)
              ) {
                console.log("Glas-lange: SmartDesign C+F deur R");

                gLDesc.value = "SmartDesign C+F deur R";
                gLCode.value = item.code;

                const match = item.code.match(/^250\.2011\.(\d{2})(NB|WH|BL)$/i);
                if (match) {
                  const sizeDigits = match[1];
                  const suffix = match[2].toUpperCase();
                  let rawSize = 0;
                  switch (sizeDigits) {
                    case "01": rawSize = 90;  break;
                    case "02": rawSize = 95;  break;
                    case "03": rawSize = 100; break;
                    case "04": rawSize = 110; break;
                    case "05": rawSize = 120; break;
                    case "06": rawSize = 130; break;
                    case "07": rawSize = 140; break;
                    case "08": rawSize = 150; break;
                    case "09": rawSize = 160; break;
                    case "10": rawSize = 170; break;
                    case "11": rawSize = 180; break;
                    default:
                      console.log("Unknown SmartDesign C+F size digit:", sizeDigits);
                  }
                  if (rawSize) {
                    const firstPart = rawSize * 10 - 30;
                    const secondPart = rawSize * 10;
                    gLMaat.value = `${firstPart}/${secondPart}x2005`;
                    console.log("SmartDesign C+F deur R size:", gLMaat.value);
                  } else {
                    gLMaat.value = "???x2005";
                  }
                  let color = "chroom";
                  switch (suffix) {
                    case "NB": color = "chroom"; break;
                    case "WH": color = "wit";    break;
                    case "BL": color = "zwart";  break;
                  }
                  gLKleur.value = color;
                  console.log("SmartDesign C+F deur R color:", color);
                } else {
                  console.log("No recognized code pattern for:", item.code);
                  gLMaat.value = "???x2005";
                  gLKleur.value = "chroom";
                }
                usedItems.add(item.code);
                continue;
              }

              // === SmartDesign C+F2 RH (example) ===
              if (
                item.code.toLowerCase().startsWith("250.2012.") &&
                item.description.toLowerCase().includes("c+f2") &&
                item.description.toLowerCase().includes("rh") &&
                !usedItems.has(item.code)
              ) {
                console.log("Matched SmartDesign C+F2 RH for code:", item.code);

                gLDesc.value = "SmartDesign C+F2 RH";
                gLCode.value = item.code;

                const match = item.code.match(/^250\.2012\.(\d{2})(NB|WH|BL)$/i);
                if (match) {
                  const sizeDigits = match[1];
                  const suffix = match[2].toUpperCase();
                  let rawSize = 0;
                  switch (sizeDigits) {
                    case "01": rawSize = 90;  break;
                    case "02": rawSize = 95;  break;
                    case "03": rawSize = 100; break;
                    case "04": rawSize = 110; break;
                    case "05": rawSize = 120; break;
                    case "06": rawSize = 130; break;
                    case "07": rawSize = 140; break;
                    case "08": rawSize = 150; break;
                    case "09": rawSize = 160; break;
                    case "10": rawSize = 170; break;
                    case "11": rawSize = 180; break;
                    default:
                      console.log("Unknown size digits:", sizeDigits);
                  }
                  if (rawSize) {
                    const firstPart = rawSize * 10 - 30;
                    const secondPart = rawSize * 10;
                    gLMaat.value = `${firstPart}/${secondPart}x2005`;
                    console.log("SmartDesign C+F2 RH size:", gLMaat.value);
                  } else {
                    gLMaat.value = "???x2005";
                  }
                  let color = "chroom";
                  switch (suffix) {
                    case "NB": color = "chroom"; break;
                    case "WH": color = "wit";    break;
                    case "BL": color = "zwart";  break;
                  }
                  gLKleur.value = color;
                  console.log("SmartDesign C+F2 RH color:", color);
                }
                usedItems.add(item.code);
                continue;
              }

              // === SmartDesign C+F2 LH ===
              if (
                item.code.toLowerCase().startsWith("250.2011.") &&
                !usedItems.has(item.code)
              ) {
                console.log("Glas-lange: SmartDesign C+F2 LH");

                gLDesc.value = "SmartDesign C+F2 LH";
                gLCode.value = item.code;

                const match = item.code.match(/^250\.2011\.(\d{2})(NB|WH|BL)$/i);
                if (match) {
                  const sizeDigits = match[1];
                  const suffix = match[2].toUpperCase();
                  let rawSize = 0;
                  switch (sizeDigits) {
                    case "01": rawSize = 90;  break;
                    case "02": rawSize = 95;  break;
                    case "03": rawSize = 100; break;
                    case "04": rawSize = 110; break;
                    case "05": rawSize = 120; break;
                    case "06": rawSize = 130; break;
                    case "07": rawSize = 140; break;
                    case "08": rawSize = 150; break;
                    case "09": rawSize = 160; break;
                    case "10": rawSize = 170; break;
                    case "11": rawSize = 180; break;
                    default:
                      console.log("Unknown digits for SmartDesign C+F2:", sizeDigits);
                  }
                  if (rawSize) {
                    const firstPart = rawSize * 10 - 30;
                    const secondPart = rawSize * 10;
                    gLMaat.value = `${firstPart}/${secondPart}x2005`;
                    console.log("SmartDesign C+F2 LH size:", gLMaat.value);
                  } else {
                    gLMaat.value = "???x2005";
                  }
                  let color = "chroom";
                  switch (suffix) {
                    case "NB": color = "chroom"; break;
                    case "WH": color = "wit";    break;
                    case "BL": color = "zwart";  break;
                  }
                  gLKleur.value = color;
                  console.log("SmartDesign C+F2 LH color:", color);
                } else {
                  gLMaat.value = "???x2005";
                  gLKleur.value = "chroom";
                }
                usedItems.add(item.code);
                continue;
              }

              // === Aqua Glass FS (+C) Side Panel (korte zijde)
              if (
                item.description.toLowerCase().includes("aqua glass fs") &&
                item.description.toLowerCase().includes("side panel") &&
                !usedItems.has(item.code)
              ) {
                console.log("Glas-korte: Aqua Glass FS (+C) Side Panel");

                const gKDesc = document.getElementById("glas-korte-description");
                const gKCode = document.getElementById("glas-korte-code");
                const gKMaat = document.getElementById("glas-korte-maat");
                const gKKleur = document.getElementById("glas-korte-kleur");

                if (gKDesc && gKCode && gKMaat && gKKleur) {
                  gKDesc.value = "Aqua Glass softclose";
                  gKCode.value = item.code;

                  const sizeMatch = item.description.match(/(\d+)x2000/i);
                  if (sizeMatch) {
                    const raw = parseInt(sizeMatch[1], 10);
                    gKMaat.value = `${raw}x2000`;
                    console.log("Aqua Glass FS side panel size:", gKMaat.value);
                  } else {
                    console.log("No '###x2000' pattern found for Aqua Glass FS side panel.");
                    gKMaat.value = "???x2000";
                  }

                  let color = "chroom";
                  const codeSuffix = item.code.slice(-2).toUpperCase();
                  switch (codeSuffix) {
                    case "NB": color = "chroom"; break;
                    case "WH": color = "wit";    break;
                    case "BL": color = "zwart";  break;
                  }
                  gKKleur.value = color;
                  console.log("Aqua Glass FS side panel color:", color);

                  usedItems.add(item.code);
                }
                continue;
              }

              // === Aqua Glass C Door (Glas-lange)
              if (
                item.description.toLowerCase().includes("aqua glass c door") &&
                !usedItems.has(item.code)
              ) {
                console.log("Glas-lange: Aqua Glass C (+FS)");

                gLDesc.value = "Aqua Glass C (+FS)";
                gLCode.value = item.code;

                const sizeMatch = item.description.match(/(\d+)x2000/i);
                if (sizeMatch) {
                  const raw = parseInt(sizeMatch[1], 10);
                  gLMaat.value = `${raw}x2000`;
                  console.log("Aqua Glass C Door size:", gLMaat.value);
                } else {
                  console.log("No '###x2000' pattern found for Aqua Glass C Door.");
                  gLMaat.value = "???x2000";
                }

                gLKleur.value = "chroom";
                console.log("Aqua Glass C Door color: chroom");

                usedItems.add(item.code);
                continue;
              }

              // === Aqua Glass C XXL + F (two dimensions)
              if (
                item.description.toLowerCase().includes("aqua glass c xxl") &&
                item.description.toLowerCase().includes("+ f") &&
                !usedItems.has(item.code)
              ) {
                console.log("Glas-lange: Aqua Glass C XXL + F");

                gLDesc.value = "Aqua Glass C XXL + F";
                gLCode.value = item.code;

                const tripleMatch = item.description.match(/(\d+)x(\d+)x2000/i);
                if (tripleMatch) {
                  const raw1 = parseInt(tripleMatch[1], 10);
                  const raw2 = parseInt(tripleMatch[2], 10);
                  const firstDim = `${raw1 - 20}/${raw1}`;
                  const secondDim = `${raw2 - 20}/${raw2}`;
                  gLMaat.value = `${firstDim}+${secondDim}x2000`;
                  console.log("Aqua Glass C XXL + F size:", gLMaat.value);
                } else {
                  console.log("No '###x###x2000' pattern found for Aqua Glass C XXL + F.");
                }

                gLKleur.value = "chroom";
                console.log("Aqua Glass C XXL + F color: chroom");

                usedItems.add(item.code);
                continue;
              }

              // === SmartDesign Solo P(+F) XXL ===
              if (
                /^250\.1410\.(0\d|1\d)(NB|WH|BL)$/i.test(item.code) &&
                item.description.toLowerCase().includes("smartdesign solo p") &&
                item.description.toLowerCase().includes("xxl") &&
                !usedItems.has(item.code)
              ) {
                console.log("Glas-lange: SmartDesign P(+F) XXL");

                gLDesc.value = "SmartDesign P(+F) XXL";
                gLCode.value = item.code;

                const match = item.code.match(/^250\.1410\.(0\d|1\d)(NB|WH|BL)$/i);
                if (match) {
                  const sizeDigits = match[1];
                  let rawSize = 0;
                  switch (sizeDigits) {
                    case "08": rawSize = 110; break;
                    case "09": rawSize = 120; break;
                    case "10": rawSize = 130; break;
                    case "11": rawSize = 140; break;
                    case "12": rawSize = 150; break;
                    case "13": rawSize = 160; break;
                    case "14": rawSize = 170; break;
                    case "15": rawSize = 180; break;
                    default:
                      console.log("Unknown XXL digits:", sizeDigits);
                  }
                  if (rawSize) {
                    const firstPart = rawSize * 10 - 30;
                    const secondPart = rawSize * 10;
                    gLMaat.value = `${firstPart}/${secondPart}x2005`;
                    console.log("SmartDesign P(+F) XXL size:", gLMaat.value);
                  } else {
                    gLMaat.value = "???x2005";
                  }
                  const suffix = match[2].toUpperCase();
                  let color = "chroom";
                  switch (suffix) {
                    case "NB": color = "chroom"; break;
                    case "WH": color = "wit";    break;
                    case "BL": color = "zwart";  break;
                  }
                  gLKleur.value = color;
                  console.log("SmartDesign P(+F) XXL color:", color);
                }
                usedItems.add(item.code);
                continue;
              }
            }

            // Nested loop for SmartDesign Solo P(+F)
            if (response && response.data) {
              for (let item2 of response.data) {
                if (
                  /^250\.(1110|1120)\.0(\d)(NB|WH|BL)$/i.test(item2.code) &&
                  item2.description.toLowerCase().includes("smartdesign solo p") &&
                  item2.description.toLowerCase().includes("transparant") &&
                  !usedItems.has(item2.code)
                ) {
                  console.log("Glas-lange: SmartDesign draaideur + F");

                  gLDesc.value = "SmartDesign draaideur + F";
                  gLCode.value = item2.code;

                  const match = item2.code.match(/^250\.(1110|1120)\.0(\d)(NB|WH|BL)$/i);
                  if (match) {
                    const sizeDigit = match[2];
                    let rawSize = 0;
                    switch (sizeDigit) {
                      case "1": rawSize = 70;  break;
                      case "2": rawSize = 75;  break;
                      case "3": rawSize = 80;  break;
                      case "4": rawSize = 85;  break;
                      case "5": rawSize = 90;  break;
                      case "6": rawSize = 95;  break;
                      case "7": rawSize = 100; break;
                      default:
                        console.log("Unknown SmartDesign Solo P size digit:", sizeDigit);
                    }
                    if (rawSize) {
                      const firstPart = rawSize * 10 - 30;
                      const secondPart = rawSize * 10;
                      gLMaat.value = `${firstPart}/${secondPart}x2005`;
                      console.log("SmartDesign Solo P(+F) size:", gLMaat.value);
                    } else {
                      gLMaat.value = "???x2005";
                    }
                    const suffix = match[3].toUpperCase();
                    let color = "chroom";
                    switch (suffix) {
                      case "NB": color = "chroom"; break;
                      case "WH": color = "wit";    break;
                      case "BL": color = "zwart";  break;
                    }
                    gLKleur.value = color;
                    console.log("SmartDesign Solo P color:", color);
                  }
                  usedItems.add(item2.code);
                  continue;
                }
              }
            }

            // Continuing the original "for" loop logic for remaining Glas lange zijde items
            for (let item of response.data) {
              // === SmartDesign deur nis XXL ===
              if (
                /^250\.1310\.(0[8-9]|1[0-5])(NB|WH|BL)$/i.test(item.code) &&
                !usedItems.has(item.code)
              ) {
                console.log("Glas-lange: SmartDesign deur nis XXL");

                gLDesc.value = "SmartDesign deur nis XXL";
                gLCode.value = item.code;

                const match = item.code.match(/^250\.1310\.(0[8-9]|1[0-5])(NB|WH|BL)$/i);
                if (match) {
                  const sizeDigits = match[1];
                  let rawSize = 0;
                  switch (sizeDigits) {
                    case "08": rawSize = 110; break;
                    case "09": rawSize = 120; break;
                    case "10": rawSize = 130; break;
                    case "11": rawSize = 140; break;
                    case "12": rawSize = 150; break;
                    case "13": rawSize = 160; break;
                    case "14": rawSize = 170; break;
                    case "15": rawSize = 180; break;
                    default:
                      console.log("Unknown XXL digits:", sizeDigits);
                  }
                  if (rawSize) {
                    const firstPart = rawSize * 10 - 30;
                    const secondPart = rawSize * 10;
                    gLMaat.value = `${firstPart}/${secondPart}x2005`;
                    console.log("SmartDesign deur nis XXL size:", gLMaat.value);
                  } else {
                    gLMaat.value = "???x2005";
                  }
                  const suffix = match[2].toUpperCase();
                  let color = "chroom";
                  switch (suffix) {
                    case "NB": color = "chroom"; break;
                    case "WH": color = "wit";    break;
                    case "BL": color = "zwart";  break;
                  }
                  gLKleur.value = color;
                  console.log("SmartDesign deur nis XXL color:", color);
                }
                usedItems.add(item.code);
                continue;
              }

              // === SmartDesign P - transparant (nisdeur) ===
              if (
                /^250\.1010\.0(\d)(NB|WH|BL)$/i.test(item.code) &&
                item.description.toLowerCase().includes("smartdesign p") &&
                item.description.toLowerCase().includes("transparant") &&
                !usedItems.has(item.code)
              ) {
                console.log("Glas-lange: SmartDesign P nis");

                gLDesc.value = "SmartDesign draaideur nis";
                gLCode.value = item.code;

                const match = item.code.match(/^250\.1010\.0(\d)(NB|WH|BL)$/i);
                if (match) {
                  const sizeDigit = match[1];
                  let rawSize = 0;
                  switch (sizeDigit) {
                    case "1": rawSize = 70;  break;
                    case "2": rawSize = 75;  break;
                    case "3": rawSize = 80;  break;
                    case "4": rawSize = 85;  break;
                    case "5": rawSize = 90;  break;
                    case "6": rawSize = 95;  break;
                    case "7": rawSize = 100; break;
                    default:
                      console.log("Unknown SmartDesign P size digit:", sizeDigit);
                  }
                  if (rawSize) {
                    const firstPart = rawSize * 10 - 30;
                    const secondPart = rawSize * 10;
                    gLMaat.value = `${firstPart}/${secondPart}x2005`;
                    console.log("SmartDesign P size:", gLMaat.value);
                  } else {
                    gLMaat.value = "???x2005";
                  }
                  const suffix = match[2].toUpperCase();
                  let color = "chroom";
                  switch (suffix) {
                    case "NB": color = "chroom"; break;
                    case "WH": color = "wit";    break;
                    case "BL": color = "zwart";  break;
                  }
                  gLKleur.value = color;
                  console.log("SmartDesign P color:", color);
                }
                usedItems.add(item.code);
                continue;
              }

              // === Aqua Glass draaideur nis ===
              if (
                item.description.toLowerCase().includes("aqua glass p nisdeur") &&
                !usedItems.has(item.code)
              ) {
                console.log("Glas-lange: Aqua Glass draaideur nis");

                gLDesc.value = "Aqua Glass draaideur nis";
                gLCode.value = item.code;

                const sizeMatch = item.description.match(/(\d+)x2000/i);
                if (sizeMatch) {
                  const raw = parseInt(sizeMatch[1], 10);
                  let firstPart = 0;
                  let secondPart = 0;
                  switch (raw) {
                    case 800:
                      firstPart = raw - 21;
                      secondPart = raw - 6;
                      break;
                    case 900:
                      firstPart = raw - 21;
                      secondPart = raw - 6;
                      break;
                    case 1000:
                      firstPart = raw - 21;
                      secondPart = raw - 6;
                      break;
                    default:
                      console.log("Aqua Glass P Nisdeur: unexpected size:", raw);
                  }
                  if (firstPart && secondPart) {
                    gLMaat.value = `${firstPart}/${secondPart}x2000`;
                    console.log("Aqua Glass P Nisdeur size:", gLMaat.value);
                  } else {
                    gLMaat.value = `???x2000`;
                  }
                } else {
                  console.log("No '###x2000' pattern found for Aqua Glass P Nisdeur.");
                }
                gLKleur.value = "chroom";
                console.log("Aqua Glass P Nisdeur color: chroom");
                usedItems.add(item.code);
                continue;
              }
            }

            // === Aqua Glass (F) in "Glas korte zijde"
            if (response && response.data) {
              const gKDesc = document.getElementById("glas-korte-description");
              const gKCode = document.getElementById("glas-korte-code");
              const gKMaat = document.getElementById("glas-korte-maat");
              const gKKleur = document.getElementById("glas-korte-kleur");

              if (gKDesc && gKCode && gKMaat && gKKleur) {
                for (let item2 of response.data) {
                  if (
                    item2.description.toLowerCase().includes("aqua glass f") &&
                    !usedItems.has(item2.code)
                  ) {
                    console.log("Glas-korte: Aqua Glass (F)");

                    gKDesc.value = "Aqua Glass (F)";
                    gKCode.value = item2.code;

                    const sizeMatch = item2.description.match(/(\d+)x1950/i);
                    if (sizeMatch) {
                      const raw = parseInt(sizeMatch[1], 10);
                      let firstPart = 0;
                      let secondPart = 0;
                      switch (raw) {
                        case 800:
                          firstPart = raw - 30;
                          secondPart = raw - 15;
                          break;
                        case 900:
                          firstPart = raw - 30;
                          secondPart = raw - 15;
                          break;
                        case 1000:
                          firstPart = raw - 30;
                          secondPart = raw - 15;
                          break;
                        default:
                          console.log("Aqua Glass F: unexpected raw size:", raw);
                      }
                      if (firstPart && secondPart) {
                        gKMaat.value = `${firstPart}/${secondPart}x1950`;
                        console.log("Aqua Glass F size:", gKMaat.value);
                      } else {
                        gKMaat.value = `???x1950`;
                      }
                    } else {
                      console.log("No '###x1950' found in Aqua Glass F description.");
                    }
                    gKKleur.value = "chroom";
                    console.log("Aqua Glass F color: chroom");

                    usedItems.add(item2.code);
                    continue;
                  }
                }
              }
            }

            // === SmartDesign F (korte zijde)
            for (let item of response.data) {
              if (
                /^250\.9110\.(0\d|1[0-2])(NB|WH|BL)$/i.test(item.code) &&
                item.description.toLowerCase().includes("smartdesign f") &&
                !usedItems.has(item.code)
              ) {
                console.log("Glas-korte: SmartDesign F");

                const gKDesc = document.getElementById("glas-korte-description");
                const gKCode = document.getElementById("glas-korte-code");
                const gKMaat = document.getElementById("glas-korte-maat");
                const gKKleur = document.getElementById("glas-korte-kleur");

                if (gKDesc && gKCode && gKMaat && gKKleur) {
                  gKDesc.value = "SmartDesign F";
                  gKCode.value = item.code;

                  const match = item.code.match(/^250\.9110\.(0\d|1[0-2])(NB|WH|BL)$/i);
                  if (match) {
                    const sizeDigits = match[1];
                    let rawSize = 0;
                    switch (sizeDigits) {
                      case "01": rawSize = 70;  break;
                      case "02": rawSize = 75;  break;
                      case "03": rawSize = 80;  break;
                      case "04": rawSize = 85;  break;
                      case "05": rawSize = 90;  break;
                      case "06": rawSize = 95;  break;
                      case "07": rawSize = 100; break;
                      case "08": rawSize = 110; break;
                      case "09": rawSize = 120; break;
                      default:
                        console.log("Unknown SmartDesign F size digits:", sizeDigits);
                    }
                    if (rawSize) {
                      gKMaat.value = `${rawSize * 10}x2005`;
                      console.log("SmartDesign F size:", gKMaat.value);
                    } else {
                      gKMaat.value = "???x2005";
                    }
                    const suffix = match[2].toUpperCase();
                    let color = "chroom";
                    switch (suffix) {
                      case "NB": color = "chroom"; break;
                      case "WH": color = "wit";    break;
                      case "BL": color = "zwart";  break;
                    }
                    gKKleur.value = color;
                    console.log("SmartDesign F color:", color);
                  }
                  usedItems.add(item.code);
                }
                continue;
              }

              // === Aqua Glass draaideur (P)
              if (
                item.description.toLowerCase().includes("aqua glass p") &&
                item.code.toLowerCase().startsWith("258.0000.") &&
                item.code.toLowerCase().endsWith("nb") &&
                !usedItems.has(item.code)
              ) {
                console.log("Glas-lange: Aqua Glass draaideur (P)");

                gLDesc.value = "Aqua Glass draaideur (P)";
                gLCode.value = item.code;

                const sizeMatch = item.description.match(/(\d+)x1950/i);
                if (sizeMatch) {
                  const raw = parseInt(sizeMatch[1], 10);
                  let firstPart = 0;
                  let secondPart = 0;
                  switch (raw) {
                    case 800:
                      firstPart = raw - 21;
                      secondPart = raw - 6;
                      break;
                    case 900:
                      firstPart = raw - 21;
                      secondPart = raw - 6;
                      break;
                    case 1000:
                      firstPart = raw - 21;
                      secondPart = raw - 6;
                      break;
                    default:
                      console.log("Aqua Glass P: unexpected size:", raw);
                  }
                  if (firstPart && secondPart) {
                    gLMaat.value = `${firstPart}/${secondPart}x1950`;
                    console.log("Aqua Glass P size:", gLMaat.value);
                  } else {
                    gLMaat.value = `???x1950`;
                  }
                } else {
                  console.log("No '###x1950' pattern found for Aqua Glass P description.");
                }
                gLKleur.value = "chroom";
                console.log("Aqua Glass P color: chroom");

                usedItems.add(item.code);
                continue;
              }

              // === Ekinox Duo (main)
              if (
                /^244\.1910\.\d{2}(SS|CO|BB)$/i.test(item.code) &&
                item.description.toLowerCase().includes("duo") &&
                !usedItems.has(item.code)
              ) {
                console.log("Glas-lange: Ekinox Duo");

                gLDesc.value = "Ekinox Duo";
                gLCode.value = item.code;

                const match = item.code.match(/^244\.1910\.(\d{2})(SS|CO|BB)$/i);
                if (match) {
                  const sizeDigits = match[1];
                  let rawSize = 0;
                  switch (sizeDigits) {
                    case "01": rawSize = 70;  break;
                    case "02": rawSize = 80;  break;
                    case "03": rawSize = 90;  break;
                    case "04": rawSize = 100; break;
                    case "05": rawSize = 120; break;
                    case "06": rawSize = 140; break;
                    default:
                      console.log("Unknown Ekinox Duo size digits:", sizeDigits);
                  }
                  if (rawSize) {
                    const firstPart = rawSize * 10 - 25;
                    const secondPart = rawSize * 10 - 10;
                    gLMaat.value = `${firstPart}/${secondPart}x2070`;
                    console.log("Ekinox Duo size:", gLMaat.value);
                  } else {
                    gLMaat.value = "???x2070";
                  }
                  const suffix = match[2].toUpperCase();
                  let color = "chroom";
                  switch (suffix) {
                    case "SS": color = "geb. RVS";    break;
                    case "CO": color = "Koper";       break;
                    case "BB": color = "Kobaltblauw"; break;
                  }
                  gLKleur.value = color;
                  console.log("Ekinox Duo color:", color);
                }
                const dpDesc = document.getElementById("glas-draaipaneel-description");
                const dpMaat = document.getElementById("glas-draaipaneel-maat");
                const dpCode = document.getElementById("glas-draaipaneel-code");
                if (dpDesc && dpMaat && dpCode) {
                  dpDesc.value = "180° naar binnen";
                  dpMaat.value = "450x2070";
                  dpCode.value = "";
                  console.log("Draaideel set for Ekinox Duo: 180°, 450x2070, code empty");
                }
                usedItems.add(item.code);
                continue;
              }

              // === Ekinox Solo plafondsteun
              if (
                /^244\.9510\.5\d(SS|CO|BB)$/i.test(item.code) &&
                item.description.toLowerCase().includes("plafond") &&
                !usedItems.has(item.code)
              ) {
                console.log("Glas-lange: Ekinox Solo plafondsteun");

                gLDesc.value = "Ekinox solo plafondsteun";
                gLCode.value = item.code;

                const match = item.code.match(/^244\.9510\.(5\d)(SS|CO|BB)$/i);
                if (match) {
                  const sizeDigits = match[1];
                  let rawSize = 0;
                  switch (sizeDigits) {
                    case "51": rawSize = 70;  break;
                    case "52": rawSize = 80;  break;
                    case "53": rawSize = 90;  break;
                    case "54": rawSize = 100; break;
                    case "55": rawSize = 120; break;
                    case "56": rawSize = 140; break;
                    default:
                      console.log("Unknown Ekinox plafond size digits:", sizeDigits);
                  }
                  if (rawSize) {
                    const firstPart = rawSize * 10 - 25;
                    const secondPart = rawSize * 10 - 10;
                    gLMaat.value = `${firstPart}/${secondPart}x2070`;
                    console.log("Ekinox Solo plafond size:", gLMaat.value);
                  } else {
                    gLMaat.value = "???x2070";
                  }
                  const suffix = match[2].toUpperCase();
                  let color = "chroom";
                  switch (suffix) {
                    case "SS": color = "geb. RVS";    break;
                    case "CO": color = "Koper";       break;
                    case "BB": color = "Kobaltblauw"; break;
                  }
                  gLKleur.value = color;
                  console.log("Ekinox Solo plafond color:", color);
                }
                usedItems.add(item.code);
                continue;
              }

              // === Ekinox Solo
              if (
                /^244\.9510\.\d{2}(SS|CO|BB)$/i.test(item.code) &&
                item.description.toLowerCase().includes("solo") &&
                !usedItems.has(item.code)
              ) {
                console.log("Glas-lange: Ekinox Solo");

                gLDesc.value = "Ekinox Solo";
                gLCode.value = item.code;

                let match = item.code.match(/^244\.9510\.(\d{2})(SS|CO|BB)$/i);
                if (match) {
                  const sizeDigits = match[1];
                  let rawSize = 0;
                  switch (sizeDigits) {
                    case "01": rawSize = 70;  break;
                    case "02": rawSize = 80;  break;
                    case "03": rawSize = 90;  break;
                    case "04": rawSize = 100; break;
                    case "05": rawSize = 120; break;
                    case "06": rawSize = 140; break;
                    default:
                      console.log("Unknown Ekinox Solo size digits:", sizeDigits);
                  }
                  if (rawSize) {
                    const firstPart = rawSize * 10 - 25;
                    const secondPart = rawSize * 10 - 10;
                    gLMaat.value = `${firstPart}/${secondPart}x2070`;
                    console.log("Ekinox Solo size:", gLMaat.value);
                  } else {
                    gLMaat.value = "???x2070";
                  }
                  const suffix = match[2].toUpperCase();
                  let color = "chroom";
                  switch (suffix) {
                    case "SS": color = "geb. RVS";    break;
                    case "CO": color = "Koper";       break;
                    case "BB": color = "Kobaltblauw"; break;
                  }
                  gLKleur.value = color;
                  console.log("Ekinox Solo color:", color);
                }
                usedItems.add(item.code);
                continue;
              }

              // === Aqua Glass Solo
              if (
                item.description.toLowerCase().includes("aqua glass solo") &&
                !usedItems.has(item.code)
              ) {
                console.log("Glas-lange: Aqua Glass Solo");

                gLDesc.value = "Aqua Glass Solo";
                gLCode.value = item.code;

                const sizeMatch = item.description.match(/(\d+)x2000/i);
                if (sizeMatch) {
                  const raw = parseInt(sizeMatch[1], 10);
                  const firstPart = raw - 15;
                  gLMaat.value = `${firstPart}/${raw}x2000`;
                  console.log("Aqua Glass Solo size (modified):", gLMaat.value);
                } else {
                  const fallback = item.description.match(/(\d+x\d+)/i);
                  if (fallback) {
                    gLMaat.value = fallback[1];
                    console.log("Aqua Glass Solo size (fallback):", gLMaat.value);
                  }
                }
                gLKleur.value = "chroom";
                console.log("Aqua Glass Solo color: chroom");
                usedItems.add(item.code);
                continue;
              }

              // === SmartDesign Solo
              if (!gLDesc.value && item.description.includes("SmartDesign Solo") && !usedItems.has(item.code)) {
                console.log("Glas-lange: SmartDesign Solo");
                gLDesc.value = "SmartDesign Solo";
                gLCode.value = item.code;
                const cm = item.description.match(/(\d+)cm/i);
                if (cm) {
                  const num = parseInt(cm[1]);
                  const firstPart = num * 10 - 25;
                  const secondPart = num * 10 - 10;
                  gLMaat.value = `${firstPart}/${secondPart}x1983`;
                  console.log("SmartDesign Solo size:", gLMaat.value);
                }
                const colReg = /(wit|zwart gekorreld|chroom)/i;
                const colMatch = item.description.match(colReg);
                let color = colMatch ? colMatch[1].toLowerCase() : "chroom";
                gLKleur.value = color;
                console.log("SmartDesign Solo color:", color);
                usedItems.add(item.code);
                continue;
              }

              // === SmartDesign Duo (main)
              if (
                !gLDesc.value &&
                item.description.toLowerCase().includes("smart design duo") &&
                !item.description.toLowerCase().includes("scherm 35cm") &&
                !usedItems.has(item.code)
              ) {
                console.log("Glas-lange: SmartDesign Duo (main)");
                gLDesc.value = "SmartDesign Duo";
                gLCode.value = item.code;
                let descClean = item.description.toLowerCase().replace(/(\d+)\+\d+cm/i, "$1cm");
                console.log("Cleaned description:", descClean);
                const sizeMatch = descClean.match(/(\d+)cm/i);
                if (sizeMatch) {
                  const sizeNumber = parseInt(sizeMatch[1], 10);
                  const first = sizeNumber * 10 - 30;
                  const second = sizeNumber * 10 - 15;
                  gLMaat.value = `${first}/${second}x1983`;
                  console.log("SmartDesign Duo size:", gLMaat.value);
                }
                const colorMatch = item.description.match(/(wit|zwart gekorreld|chroom)/i);
                let color = colorMatch ? colorMatch[1].toLowerCase() : "chroom";
                gLKleur.value = color;
                console.log("SmartDesign Duo color:", color);
                const dpDesc = document.getElementById("glas-draaipaneel-description");
                const dpMaat = document.getElementById("glas-draaipaneel-maat");
                if (dpDesc && dpMaat) {
                  dpDesc.value = "180° naar binnen";
                  dpMaat.value = "350x1983";
                  console.log("Draaipaneel set for main Duo");
                }
                const dpCode = document.getElementById("glas-draaipaneel-code");
                if (dpCode) {
                  const foundDuo35 = response.data.find((obj) =>
                    obj.description.toLowerCase().includes("smart design duo scherm 35cm")
                  );
                  if (foundDuo35) {
                    dpCode.value = "250.1910.20NB";
                    console.log("Side screen code set:", dpCode.value);
                  }
                }
                usedItems.add(item.code);
                continue;
              }

              // === SmartDesign DUO side-screen only
              if (
                item.description.toLowerCase().includes("smart design duo scherm 35cm") &&
                !usedItems.has(item.code)
              ) {
                console.log("Side-screen item found. Filling only draaipaneel.");
                const dpDesc = document.getElementById("glas-draaipaneel-description");
                const dpMaat = document.getElementById("glas-draaipaneel-maat");
                const dpCode = document.getElementById("glas-draaipaneel-code");
                if (dpDesc && dpMaat && dpCode) {
                  dpDesc.value = "180° naar binnen";
                  dpMaat.value = "350x1983";
                  dpCode.value = "250.1910.20NB";
                  console.log("Draaipaneel set for DUO side-screen only.");
                }
                usedItems.add(item.code);
                continue;
              }

              // === Aqua Glass Duo (main, modified logic)
              if (
                !gLDesc.value &&
                item.description.toLowerCase().includes("aqua glass duo") &&
                !item.description.toLowerCase().includes("draai zijpaneel 300x2000") &&
                !usedItems.has(item.code)
              ) {
                console.log("Glas-lange: Aqua Glass Duo (main)");
                gLDesc.value = "Aqua Glass Duo";
                gLCode.value = item.code;
                const mainSize = item.description.match(/(\d+)x2000/i);
                if (mainSize) {
                  const raw = parseInt(mainSize[1], 10);
                  const firstPart = raw - 15;
                  gLMaat.value = `${firstPart}/${raw}x2000`;
                  console.log("Aqua Glass Duo size (modified):", gLMaat.value);
                } else {
                  const fallback = item.description.match(/(\d+x\d+)/i);
                  if (fallback) {
                    gLMaat.value = fallback[1];
                    console.log("Aqua Glass Duo size (fallback):", gLMaat.value);
                  }
                }
                gLKleur.value = "chroom";
                console.log("Aqua Glass Duo color: chroom");
                usedItems.add(item.code);
                continue;
              }

              // === Aqua Glass Duo (side panel only)
              if (
                item.description.toLowerCase().includes("aqua glass duo") &&
                item.description.toLowerCase().includes("draai zijpaneel 300x2000") &&
                !usedItems.has(item.code)
              ) {
                console.log("Aqua Glass Duo side panel: fill draaipaneel only");
                const dpDesc = document.getElementById("glas-draaipaneel-description");
                const dpMaat = document.getElementById("glas-draaipaneel-maat");
                const dpCode = document.getElementById("glas-draaipaneel-code");
                if (dpDesc && dpMaat && dpCode) {
                  dpDesc.value = "90° naar binnen & buiten";
                  dpMaat.value = "300x2000";
                  dpCode.value = "258.0000.09NB";
                  console.log("Draaipaneel set: 90°, 300x2000, code 258.0000.09NB");
                }
                usedItems.add(item.code);
                continue;
              }

              // === Inloopdouche G transparant
              if (
                item.description.toLowerCase().includes("inloopdouche g transparant") &&
                !usedItems.has(item.code)
              ) {
                console.log("Glas-lange: Inloopdouche G");
                gLDesc.value = "Giada transparant";
                gLCode.value = item.code;
                const dashMatch = item.description.match(/(\d+)-(\d+),5cm/i);
                if (dashMatch) {
                  const firstNum = parseInt(dashMatch[1], 10) * 10;
                  const secondNum = parseInt(dashMatch[2], 10) * 10 + 5;
                  gLMaat.value = `${firstNum}/${secondNum}x2000`;
                  console.log("Inloopdouche G size:", gLMaat.value);
                } else {
                  console.log("No dash-size match found for Inloopdouche G.");
                }
                gLKleur.value = "chroom";
                console.log("Inloopdouche G color: chroom");
                usedItems.add(item.code);
                continue;
              }

              // === Inloopdouche G satijnband
              if (
                item.description.toLowerCase().includes("inloopdouche g satijnband") &&
                !usedItems.has(item.code)
              ) {
                console.log("Glas-lange: Inloopdouche G satijnband");
                gLDesc.value = "Giada satijnband";
                gLCode.value = item.code;
                const dashMatch = item.description.match(/(\d+)-(\d+),5cm/i);
                if (dashMatch) {
                  const firstNum = parseInt(dashMatch[1], 10) * 10;
                  const secondNum = parseInt(dashMatch[2], 10) * 10 + 5;
                  gLMaat.value = `${firstNum}/${secondNum}x2000`;
                  console.log("Inloopdouche G satijnband size:", gLMaat.value);
                } else {
                  console.log("No dash-size match for Inloopdouche G satijnband.");
                }
                gLKleur.value = "chroom";
                console.log("Inloopdouche G satijnband color: chroom");
                usedItems.add(item.code);
                continue;
              }

              // === Inloopdouche draaideel G satijnband 37cm LH
              if (
                item.description.toLowerCase().includes("inloopdouche draaideel g satijnband 37cm lh") &&
                !usedItems.has(item.code)
              ) {
                console.log("Draaideel: Inloopdouche G satijnband 37cm LH");
                const dpDesc = document.getElementById("glas-draaipaneel-description");
                const dpMaat = document.getElementById("glas-draaipaneel-maat");
                const dpCode = document.getElementById("glas-draaipaneel-code");
                if (dpDesc && dpMaat && dpCode) {
                  dpDesc.value = "Giada satijnband LH";
                  dpMaat.value = "370x2000";
                  dpCode.value = item.code;
                  console.log("Draaipaneel set for LH: 370x2000, color chroom");
                }
                usedItems.add(item.code);
                continue;
              }

              // === Inloopdouche draaideel G satijnband 37cm RH
              if (
                item.description.toLowerCase().includes("inloopdouche draaideel g satijnband 37cm rh") &&
                !usedItems.has(item.code)
              ) {
                console.log("Draaideel: Inloopdouche G satijnband 37cm RH");
                const dpDesc = document.getElementById("glas-draaipaneel-description");
                const dpMaat = document.getElementById("glas-draaipaneel-maat");
                const dpCode = document.getElementById("glas-draaipaneel-code");
                if (dpDesc && dpMaat && dpCode) {
                  dpDesc.value = "Giada satijnband RH";
                  dpMaat.value = "370x2000";
                  dpCode.value = item.code;
                  console.log("Draaipaneel set for RH: 370x2000, color chroom");
                }
                usedItems.add(item.code);
                continue;
              }
            }

            // === SmartDesign F2 (korte zijde)
            if (response && response.data) {
              for (let item2 of response.data) {
                if (
                  /^250\.9210\.(\d{2})(NB|WH|BL)$/i.test(item2.code) &&
                  item2.description.toLowerCase().includes("smartdesign f2") &&
                  !usedItems.has(item2.code)
                ) {
                  console.log("Glas-korte: SmartDesign F2");
                  const gKDesc = document.getElementById("glas-korte-description");
                  const gKCode = document.getElementById("glas-korte-code");
                  const gKMaat = document.getElementById("glas-korte-maat");
                  const gKKleur = document.getElementById("glas-korte-kleur");
                  if (gKDesc && gKCode && gKMaat && gKKleur) {
                    gKDesc.value = "Smartdesign F2";
                    gKCode.value = item2.code;
                    const match = item2.code.match(/^250\.9210\.(\d{2})(NB|WH|BL)$/i);
                    if (match) {
                      const sizeDigits = match[1];
                      const suffix = match[2].toUpperCase();
                      let rawSize = 0;
                      switch (sizeDigits) {
                        case "01": rawSize = 70;  break;
                        case "02": rawSize = 75;  break;
                        case "03": rawSize = 80;  break;
                        case "04": rawSize = 85;  break;
                        case "05": rawSize = 90;  break;
                        case "06": rawSize = 95;  break;
                        case "07": rawSize = 100; break;
                        case "08": rawSize = 110; break;
                        case "09": rawSize = 120; break;
                        default:
                          console.log("Unknown SmartDesign F2 size digits:", sizeDigits);
                      }
                      if (rawSize) {
                        gKMaat.value = `${rawSize * 10}x2005`;
                        console.log("SmartDesign F2 size:", gKMaat.value);
                      } else {
                        gKMaat.value = "???x2005";
                      }
                      let color = "chroom";
                      switch (suffix) {
                        case "NB": color = "chroom"; break;
                        case "WH": color = "wit";    break;
                        case "BL": color = "zwart";  break;
                      }
                      gKKleur.value = color;
                      console.log("SmartDesign F2 color:", color);
                    }
                    usedItems.add(item2.code);
                  }
                }
              }
            }

            // === Ekinox korte zijde
            for (let item of response.data) {
              if (
                item.description.toLowerCase().includes("ekinox fx") &&
                !usedItems.has(item.code)
              ) {
                console.log("Glas-korte: Ekinox short side");
                const gKDesc = document.getElementById("glas-korte-description");
                const gKCode = document.getElementById("glas-korte-code");
                const gKMaat = document.getElementById("glas-korte-maat");
                const gKKleur = document.getElementById("glas-korte-kleur");
                if (gKDesc && gKCode && gKMaat && gKKleur) {
                  gKDesc.value = "Ekinox FX";
                  gKCode.value = item.code;
                  const cmMatch = item.description.match(/(\d+)cm/i);
                  if (cmMatch) {
                    const raw = parseInt(cmMatch[1], 10);
                    const firstPart = raw * 10 - 25;
                    const secondPart = raw * 10 - 10;
                    gKMaat.value = `${firstPart}/${secondPart}x2070`;
                    console.log("Ekinox size:", gKMaat.value);
                  } else {
                    console.log("No 'XXcm' pattern found for Ekinox short side size.");
                  }
                  let color = "";
                  const suffix = item.code.slice(-2).toUpperCase();
                  switch (suffix) {
                    case "SS":
                      color = "Geb. RVS";
                      break;
                    case "CO":
                      color = "Koper";
                      break;
                    case "BB":
                      color = "Kobaltblauw";
                      break;
                    default:
                      color = "chroom";
                  }
                  gKKleur.value = color;
                  console.log("Ekinox color:", color);
                }
                usedItems.add(item.code);
                continue;
              }
            }
          }
        }

        // -------------------------------------
        // 2.4 Douchesets
        // -------------------------------------
        if (response && response.data) {
          for (let item of response.data) {
            // Brauer Chrome Edition - Doucheset
            if (
              item.description.toLowerCase().includes("brauer chrome edition") &&
              item.description.toLowerCase().includes("doucheset") &&
              !usedItems.has(item.code)
            ) {
              console.log("Filling Brauer doucheset fields with code:", item.code);
              dsCode.value  = item.code;
              dsType.value  = "Brauer handdoucheset";
              dsKleur.value = "chroom";
              usedItems.add(item.code);
              continue;
            }
            // Brauer Chrome Edition - Regendouche
            if (
              item.description.toLowerCase().includes("brauer chrome edition") &&
              item.description.toLowerCase().includes("regendouche") &&
              !usedItems.has(item.code)
            ) {
              console.log("Filling Brauer regendouche fields with code:", item.code);
              dsCode.value  = item.code;
              dsType.value  = "Brauer regendoucheset";
              dsKleur.value = "chroom";
              usedItems.add(item.code);
              continue;
            }
            // Brauer Gun Metal Regendouche
            if (
              item.description.toLowerCase().includes("brauer gun metal") &&
              item.description.toLowerCase().includes("regendouche") &&
              !usedItems.has(item.code)
            ) {
              console.log("Filling Brauer Gun Metal regendouche fields for code:", item.code);
              dsCode.value  = item.code;
              dsType.value  = "Brauer regendoucheset";
              dsKleur.value = "Gun Metal";
              usedItems.add(item.code);
              continue;
            }
            // Grohe inbouw rond
            if (item.code.toLowerCase() === "350.5025.01nb") {
              dsCode.value  = item.code;
              dsType.value  = "Grohe inbouw rond";
              dsKleur.value = "chroom";
              usedItems.add(item.code);
              console.log("Doucheset => code:", item.code, ", type: Grohe inbouw rond, color: chroom");
              continue;
            }
            // Grohe inbouw vierkant
            if (item.code.toLowerCase() === "350.5025.02nb") {
              dsCode.value  = item.code;
              dsType.value  = "Grohe inbouw vierkant";
              dsKleur.value = "chroom";
              usedItems.add(item.code);
              console.log("Doucheset => code:", item.code, ", type: Grohe inbouw vierkant, color: chroom");
              continue;
            }
            // Grohe glijstangset
            if (item.code.toLowerCase() === "350.5022.13nb") {
              dsCode.value  = item.code;
              dsType.value  = "Grohe glijstangset";
              dsKleur.value = "chroom";
              usedItems.add(item.code);
              console.log("Doucheset => code:", item.code, ", type: Grohe glijstangset, color: chroom");
              continue;
            }
            // HansGrohe regendoucheset (zwart)
            if (item.code.toLowerCase() === "350.5070.06bl") {
              dsCode.value  = item.code;
              dsType.value  = "HansGrohe regendoucheset";
              dsKleur.value = "zwart";
              usedItems.add(item.code);
              console.log("Doucheset => code:", item.code, ", type: HansGrohe regendoucheset, color: zwart");
              continue;
            }
            // HansGrohe vierkant regend.
            if (item.code.toLowerCase() === "350.5022.11nb") {
              dsCode.value  = item.code;
              dsType.value  = "HansGrohe vierkant regend.";
              dsKleur.value = "chroom";
              usedItems.add(item.code);
              console.log("Doucheset => code:", item.code, ", type: HansGrohe vierkant regend., color: chroom");
              continue;
            }
            // HansGrohe regend. mengkraan
            if (item.code.toLowerCase() === "350.5070.05nb") {
              dsCode.value  = item.code;
              dsType.value  = "HansGrohe regend. mengkraan";
              dsKleur.value = "chroom";
              usedItems.add(item.code);
              console.log("Doucheset => code:", item.code, ", type: HansGrohe regend. mengkraan, color: chroom");
              continue;
            }
            // Grohe douche mengkraan
            if (item.code.toLowerCase() === "350.5020.20nb") {
              dsCode.value  = item.code;
              dsType.value  = "Grohe douche mengkraan";
              dsKleur.value = "chroom";
              usedItems.add(item.code);
              console.log("Doucheset => code:", item.code, ", type: Grohe douche mengkraan, color: chroom");
              continue;
            }
            // Grohe bad mengkraan
            if (item.code.toLowerCase() === "350.5020.14nb") {
              dsCode.value  = item.code;
              dsType.value  = "Grohe bad mengkraan";
              dsKleur.value = "chroom";
              usedItems.add(item.code);
              console.log("Doucheset => code:", item.code, ", type: Grohe bad mengkraan, color: chroom");
              continue;
            }
            // Grohe een-greeps douchekraan
            if (item.code.toLowerCase() === "350.5020.35nb") {
              dsCode.value  = item.code;
              dsType.value  = "Grohe een-greeps douchekraan";
              dsKleur.value = "chroom";
              usedItems.add(item.code);
              console.log("Doucheset => code:", item.code, ", type: Grohe een-greeps douchekraan, color: chroom");
              continue;
            }
          }
        }

        // -------------------------------------
        // 2.5 Handgrepen
        // -------------------------------------
        if (response && response.data) {
          let handgripUsedCount = 0; // how many put in dedicated fields

          // The 2 dedicated “Handgreep” rows
          const handRow1 = {
            codeField:   document.getElementById("handgreep-code"),
            amountField: document.getElementById("handgreep-aantal"),
            sizeField:   document.getElementById("handgreep-maat"),
            colorField:  document.getElementById("handgreep-kleur"),
          };
          const handRow2 = {
            codeField:   document.getElementById("handgreep2-code"),
            amountField: document.getElementById("handgreep2-aantal"),
            sizeField:   document.getElementById("handgreep2-maat"),
            colorField:  document.getElementById("handgreep2-kleur"),
          };

          // Known codes => { size, color }
          const handgreepMap = {
            "313.1050.30nb": { size: "30cm", color: "wit" },
            "313.1050.40nb": { size: "60cm", color: "wit" },
            "313.1050.50nb": { size: "45cm", color: "wit" },
            "313.1050.43nb": { size: "45cm", color: "chroom" },
            "313.1050.40ch": { size: "45cm (S-shape)", color: "chroom" },
            "313.1050.25ch": { size: "25cm", color: "chroom" },
            "313.1050.44nb": { size: "61cm", color: "chroom" }
          };

          for (let item of response.data) {
            const codeLower = item.code.toLowerCase();
            const descLower = item.description.toLowerCase();
            const isHandgrip =
              handgreepMap[codeLower] !== undefined ||
              descLower.includes("handgreep") ||
              descLower.includes("grab rail");

            if (isHandgrip && !usedItems.has(item.code)) {
              console.log("Detected handgrip:", item.code, item.description);
              let size = "???";
              let color = "???";
              if (handgreepMap[codeLower]) {
                size  = handgreepMap[codeLower].size;
                color = handgreepMap[codeLower].color;
              } else {
                if (descLower.includes("wit")) {
                  color = "wit";
                } else if (descLower.includes("chroom") || descLower.includes("chrome")) {
                  color = "chroom";
                }
                const sizeMatch = descLower.match(/(\d+)cm/);
                if (sizeMatch) {
                  size = sizeMatch[1] + "cm";
                }
              }
              if (handgripUsedCount < 2) {
                const target = handgripUsedCount === 0 ? handRow1 : handRow2;
                target.codeField.value = item.code;
                target.amountField.value = item.amount;
                target.sizeField.value = size;
                target.colorField.value = color;
                console.log(`Handgreep row #${handgripUsedCount + 1} => code: ${item.code}, size: ${size}, color: ${color}`);
                handgripUsedCount++;
              } else {
                if (usedExtraRowsCount >= extraRows.length) {
                  console.log("Not enough extra rows for handgrepen. usedExtraRowsCount:", usedExtraRowsCount, "Extra rows:", extraRows.length);
                  addTwoMoreFields();
                }
                const row = extraRows[usedExtraRowsCount];
                usedExtraRowsCount++;
                row.querySelector('input[name="article"]').value = item.code;
                row.querySelector('input[name="description"]').value = `Handgreep: ${size} - ${color}`;
                row.querySelector('input[name="quantity"]').value = item.amount;
                console.log("Extra product row used for handgreep => code:", item.code);
              }
              usedItems.add(item.code);
            }
          }
        }
		
		// -------------------------------------
		// 2.6 Douchestoel
		// -------------------------------------
		if (response && response.data) {
		  // Define a mapping for douchestoel products by article code.
		  const douchestoelMap = {
			"320.5050.04NB": { type: "Douchekruk 150kg", color: "wit/grijs" },
			"320.5050.03NB": { type: "Opklapbare douchestoel", color: "wit" },
			"320.5050.05NB": { type: "Douchekruk 300kg", color: "wit/grijs" },
			"320.5050.02NB": { type: "Moderne douchekruk",    color: "zwart" },
			"320.5050.01NB": { type: "Moderne douchekruk",    color: "wit" },
			"313.1002.00NB": { type: "Linido douchestoel",     color: "wit" },
			"313.1002.00AN": { type: "Linido douchestoel",     color: "antraciet" },
			"350.5030.02NB": { type: "Invacare douchestoel",   color: "wit" },
			"350.5030.01NB": { type: "Etac douchestoel",       color: "wit" }
		  };

		  for (let item of response.data) {
			// Check if the product code is one of the douchestoel codes.
			if (douchestoelMap.hasOwnProperty(item.code)) {
			  console.log("Douchestoel product found:", item.code);

			  // Get references to the douchestoel fields.
			  const douchestoelCodeField = document.getElementById("douchestoel-code");
			  const douchestoelTypeField = document.getElementById("douchestoel-type");
			  const douchestoelKleurField = document.getElementById("douchestoel-kleur");

			  if (douchestoelCodeField && douchestoelTypeField && douchestoelKleurField) {
				// Fill in the fields using the mapping.
				douchestoelCodeField.value = item.code;
				douchestoelTypeField.value = douchestoelMap[item.code].type;
				douchestoelKleurField.value = douchestoelMap[item.code].color;
				console.log("Douchestoel fields filled:", item.code, 
				  douchestoelTypeField.value, douchestoelKleurField.value);
				break; // Stop after filling in the douchestoel fields.
			  }
			}
		  }
		}
		// -------------------------------------
		// 2.7 Additional Installation Options
		// -------------------------------------
		if (response && response.data) {
		  // 2.7.1 Afvoer bouwafval:
		  // If the code "890.0220.00NB" is present, set the Afvoer select to "Mobilae 890.0220.00NB"
		  const afvoerSelect = document.getElementById("afvoer");
		  if (afvoerSelect) {
			const hasAfvoerCode = response.data.some(item => item.code === "890.0220.00NB");
			if (hasAfvoerCode) {
			  afvoerSelect.value = "Mobilae 890.0220.00NB";
			  console.log("Afvoer: set to Mobilae 890.0220.00NB");
			  usedItems.add("890.0220.00NB");
			}
		  }
		  
		  // 2.7.2 Core assortiment:
		  // If the code "890.1070.23DI" is present, check the core-assortment checkbox.
		  const coreAssortment = document.getElementById("core-assortiment");
		  if (coreAssortment) {
			const hasCoreCode = response.data.some(item => item.code === "890.1070.23DI");
			if (hasCoreCode) {
			  coreAssortment.checked = true;
			  console.log("Core assortiment checkbox checked");
			  usedItems.add("890.1070.23DI");
			}
		  }
		  
		  // 2.7.3 Douchestoel (stoel-notes):
		  // If the douchestoel-code field contains one of the specified codes, check the stoel-notes checkbox.
		  const douchestoelCodeField = document.getElementById("douchestoel-code");
		  const stoelNotes = document.getElementById("stoel-notes");
		  if (douchestoelCodeField && stoelNotes) {
			const code = douchestoelCodeField.value.trim();
			if (["320.5050.03NB", "313.1002.00NB", "313.1002.00AN"].includes(code)) {
			  stoelNotes.checked = true;
			  console.log("Stoel-notes checkbox checked");
			  usedItems.add(code);
			}
		  }
		  
		  // 2.7.4 Garantie:
		  // Set the Garantie select to "5 jaar 890.0113.00SA" by default.
		  const garantieSelect = document.getElementById("garantie");
		  if (garantieSelect) {
			garantieSelect.value = "5 jaar 890.0113.00SA";
			console.log("Garantie set to 5 jaar 890.0113.00SA");
		  }
		  
		  // 2.7.5 Type select:
		  // If the code "890.0225.10BE" is present then set type to option B, else option A.
		  const typeSelect = document.getElementById("type");
			if (typeSelect) {
			  const typeBItems = response.data.filter(item => item.code.startsWith("890.0225.10"));
			  if (typeBItems.length > 0) {
				typeSelect.value = "B 890.0225.10BE";
				console.log("Type set to option B (found codes: " + typeBItems.map(item => item.code).join(", ") + ")");
				// Mark every product whose code starts with "890.0225.10" as used.
				typeBItems.forEach(item => usedItems.add(item.code));
			  } else {
				typeSelect.value = "A 890.0225.01BE";
				console.log("Type set to option A (default)");
			  }
			}
		  
		  // 2.7.6 Additional extra options (checkboxes and a text input):
		  // For each extra installation option, if its code is found in response.data,
		  // then check the corresponding checkbox or set the text input value.
		  const extraOptions = [
			{ code: "890.0220.25SH", elementId: "extra-uren", isCheckbox: false },
			{ code: "890.0220.30NB", elementId: "meubel", isCheckbox: true },
			{ code: "890.0440.00DT", elementId: "toilet", isCheckbox: true },
			{ code: "890.0222.05NB", elementId: "douchetoilet", isCheckbox: true },
			{ code: "320.5030.08NB", elementId: "prefab", isCheckbox: true },
			{ code: "890.0222.04NB", elementId: "radiator", isCheckbox: true },
			{ code: "890.0225.20NB", elementId: "ladderlift", isCheckbox: true }
		  ];
		  
		  extraOptions.forEach(opt => {
			const elem = document.getElementById(opt.elementId);
			const item = response.data.find(entry => entry.code === opt.code);
			
			if (item && elem) {
				if (opt.isCheckbox) {
					elem.checked = true;
					console.log(`Checkbox '${opt.elementId}' checked (code ${opt.code} found)`);
				} else {
					// Ensure it's setting the amount and not the code
					elem.value = item.amount || "1";  // Default to "1" if amount is missing
					console.log(`Text input '${opt.elementId}' set to amount ${item.amount}`);
				}
				usedItems.add(opt.code);
			}
		});
		}


// ---------
// 3 Highlight Empty Fields & Unchecked Checkboxes
// ---------
function highlightEmptyFields() {
  // Select all input, select, and textarea elements on the page.
  const fields = document.querySelectorAll("input, select, textarea");

  fields.forEach(field => {
    // Only consider visible elements
    if (field.offsetParent !== null) {

      // --- Skip fields inside the extra products section ---
      if (field.closest(".extra-products-grid")) {
        // If a field is in the extra products grid, do not add the error highlight.
        return;
      }

      // For dropdowns (select elements), check if the current value is "Kiezen"
      if (field.tagName.toLowerCase() === "select") {
        if (field.value.trim() === "Kiezen") {
          field.classList.add("error-highlight");
        } else {
          field.classList.remove("error-highlight");
        }
      }
      // For checkboxes and radio buttons: if not checked, add error highlight.
      else if (field.type === "checkbox" || field.type === "radio") {
        if (!field.checked) {
          field.classList.add("error-highlight");
        } else {
          field.classList.remove("error-highlight");
        }
      }
      // For other inputs/textareas: if empty, add error highlight.
      else {
        if (field.value.trim() === "") {
          field.classList.add("error-highlight");
        } else {
          field.classList.remove("error-highlight");
        }
      }
    }
  });
}
highlightEmptyFields();

		// ---------
		// 3.1 Auto-remove Error Highlight on Field Update
		// ---------
		document.querySelectorAll("input, select, textarea").forEach(field => {
		  // For text inputs and textareas, use the "input" event.
		  field.addEventListener("input", function () {
			// Only act if the field is not a select, checkbox, or radio.
			if (field.tagName.toLowerCase() !== "select" &&
				field.type !== "checkbox" &&
				field.type !== "radio") {
			  if (field.value.trim() !== "") {
				field.classList.remove("error-highlight");
				console.log("Removed error-highlight (input):", field);
			  }
			}
		  });

		  // For dropdowns, check on change.
		  field.addEventListener("change", function () {
			if (field.tagName.toLowerCase() === "select") {
			  if (field.value.trim() !== "Kiezen") {
				field.classList.remove("error-highlight");
				console.log("Removed error-highlight (select change):", field);
			  }
			}
			// For checkboxes and radios.
			else if (field.type === "checkbox" || field.type === "radio") {
			  if (field.checked) {
				field.classList.remove("error-highlight");
				console.log("Removed error-highlight (checkbox/radio change):", field);
			  }
			}
		  });
		});

		// -------------------------------------
		// 3.2 Fill Extra Producten with Unused Items
		// -------------------------------------
		if (response && response.data) {
		  for (let item of response.data) {
			// Only process items that have not yet been used in previous sections.
			if (!usedItems.has(item.code)) {
			  // If there are no extra rows available, add 2 new extra product fields.
			  if (usedExtraRowsCount >= extraRows.length) {
				console.log("Not enough extra rows. Adding two more.");
				addTwoMoreFields();
			  }
			  // Get the next available extra product row.
			  const row = extraRows[usedExtraRowsCount];
			  usedExtraRowsCount++;

			  // Fill in the extra product row:
			  // Articlecode, Description, and Aantal.
			  row.querySelector('input[name="article"]').value = item.code;
			  row.querySelector('input[name="description"]').value = item.description;
			  row.querySelector('input[name="quantity"]').value = item.amount;
			  
			  console.log("Extra product filled:", item.code, item.description, item.amount);
			  
			  // Mark the item as used.
			  usedItems.add(item.code);
			}
		  }
		}
	  } // end callback
    ); // end runtime.sendMessage
  }); // end loadDataButton click
  
		// ------------------------------
		// Sync "client-number" inputs
		// ------------------------------
		const clientNumberInputs = document.querySelectorAll(".client-number + input");

		function syncClientNumberInput(event) {
			const value = event.target.value;
			clientNumberInputs.forEach(input => {
				if (input !== event.target) {
					input.value = value;
				}
			});
		}

		clientNumberInputs.forEach(input => {
			input.addEventListener("input", syncClientNumberInput);
		});

		// ------------------------------
		// Sync "advisor" inputs
		// ------------------------------
		const advisorInputs = document.querySelectorAll(".advisor + input");

		function syncAdvisorInput(event) {
			const value = event.target.value;
			advisorInputs.forEach(input => {
				if (input !== event.target) {
					input.value = value;
				}
			});
		}

		advisorInputs.forEach(input => {
			input.addEventListener("input", syncAdvisorInput);
		});
  
	// -----------------------------------
	// 	photo upload
	// -----------------------------------
  
		  const upload2D = document.getElementById("upload-2d-photo");
		  const preview2D = document.getElementById("preview-2d-photo");
		  upload2D.addEventListener("change", function (event) {
			const file = event.target.files[0];
			if (file) {
			  console.log("2D File selected:", file);
			  const img = document.createElement("img");
			  img.src = URL.createObjectURL(file);
			  img.alt = "2D Uploaded Preview";
			  preview2D.innerHTML = "";
			  preview2D.appendChild(img);
			}
		  });

		  const upload3D = document.getElementById("upload-3d-photo");
		  const preview3D = document.getElementById("preview-3d-photo");
		  upload3D.addEventListener("change", function (event) {
			const file = event.target.files[0];
			if (file) {
			  console.log("3D File selected:", file);
			  const img = document.createElement("img");
			  img.src = URL.createObjectURL(file);
			  img.alt = "3D Uploaded Preview";
			  preview3D.innerHTML = "";
			  preview3D.appendChild(img);
			}
		  });
  
}); // end DOMContentLoaded
