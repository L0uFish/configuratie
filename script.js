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
	  //  Get today's date and format it as dd-mm-yyyy
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
      "adfmkooomcpdikkgalpdmjfhjlciemlj",
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
		
		// === Fill Remarks ===
		if (response && response.remarks !== undefined) {
			console.log("Remarks received:", response.remarks);
			
			const remarksField = document.getElementById("opmerkingen");
			
			if (remarksField) {
				if (response.remarks.trim() !== "") {
					remarksField.value = response.remarks;
					console.log("Remarks filled:", response.remarks);
				} else {
					console.log("Remarks field found, but response.remarks is empty.");
				}
			} else {
				console.log("ERROR: Remarks field #opmerkingen not found in the DOM.");
			}
		} else {
			console.log("ERROR: No remarks field in the response object.");
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

                gL