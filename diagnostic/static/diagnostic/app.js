(function () {
  "use strict";

  const form = document.getElementById("form-scan");
  const inCamera = document.getElementById("photo_camera");
  const inGalerie = document.getElementById("photo_galerie");
  const dropzone = document.getElementById("dropzone");
  const zoneContenu = document.getElementById("zone-contenu");
  const previewWrapper = document.getElementById("preview-wrapper");
  const apercu = document.getElementById("apercu-local");
  const btnReinit = document.getElementById("btn-reinit");
  const fileStatus = document.getElementById("file-status");
  const nomEl = document.getElementById("nom-fichier");
  const erreurEl = document.getElementById("message-erreur");
  const btn = document.getElementById("btn-analyser");
  const btnTxt = btn.querySelector(".txt");

  const FORMATS_OK = ["image/jpeg", "image/png"];
  const COTE_MAX = 1280;          // réduction avant envoi (économie de données mobile)
  const SEUIL_REDUCTION = 1.5 * 1024 * 1024;
  const TEXTE_BTN_INITIAL = btnTxt.textContent;

  let urlApercu = null;
  let traitement = Promise.resolve();

  function montrerErreur(msg) {
    if (erreurEl) {
      const span = erreurEl.querySelector("span") || erreurEl;
      span.textContent = msg;
      erreurEl.hidden = false;
    }
  }

  function cacherErreur() {
    if (erreurEl) {
      erreurEl.hidden = true;
    }
  }

  function reinitialiser() {
    if (urlApercu) {
      URL.revokeObjectURL(urlApercu);
      urlApercu = null;
    }
    if (inCamera) inCamera.value = "";
    if (inGalerie) inGalerie.value = "";
    
    if (apercu) {
      apercu.removeAttribute("src");
    }
    if (previewWrapper) previewWrapper.hidden = true;
    if (zoneContenu) zoneContenu.hidden = false;
    if (dropzone) dropzone.classList.remove("has-photo");
    if (fileStatus) fileStatus.hidden = true;
  }

  async function reduire(fichier) {
    if (!window.createImageBitmap) return null;
    const bmp = await createImageBitmap(fichier, { imageOrientation: "from-image" });
    const echelle = Math.min(1, COTE_MAX / Math.max(bmp.width, bmp.height));
    if (echelle === 1 && fichier.size < SEUIL_REDUCTION) {
      bmp.close();
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * echelle);
    canvas.height = Math.round(bmp.height * echelle);
    canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();

    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.9));
    if (!blob) return null;
    const base = fichier.name.replace(/\.[^.]+$/, "") || "photo_sol";
    return new File([blob], base + ".jpg", { type: "image/jpeg" });
  }

  async function traiterChoix(inputActif, autreInput) {
    if (autreInput) autreInput.value = "";
    cacherErreur();

    const fichier = inputActif.files[0];
    if (!fichier) {
      reinitialiser();
      return;
    }

    if (!FORMATS_OK.includes(fichier.type)) {
      reinitialiser();
      montrerErreur("Format non pris en charge. Veuillez choisir une photo JPG ou PNG.");
      return;
    }

    // Afficher l'aperçu immédiatement
    if (urlApercu) URL.revokeObjectURL(urlApercu);
    urlApercu = URL.createObjectURL(fichier);
    
    if (apercu) apercu.src = urlApercu;
    if (zoneContenu) zoneContenu.hidden = true;
    if (previewWrapper) previewWrapper.hidden = false;
    if (dropzone) dropzone.classList.add("has-photo");
    
    if (fileStatus && nomEl) {
      nomEl.textContent = fichier.name;
      fileStatus.hidden = false;
    }

    // Optimisation silencieuse en arrière-plan
    traitement = (async () => {
      try {
        const reduit = await reduire(fichier);
        if (reduit) {
          const dt = new DataTransfer();
          dt.items.add(reduit);
          inputActif.files = dt.files;
        }
      } catch (err) {
        // En cas d'exception, on conserve le fichier d'origine
      }
    })();
  }

  if (inCamera) inCamera.addEventListener("change", () => traiterChoix(inCamera, inGalerie));
  if (inGalerie) inGalerie.addEventListener("change", () => traiterChoix(inGalerie, inCamera));
  if (btnReinit) btnReinit.addEventListener("click", reinitialiser);

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fichier = (inCamera && inCamera.files[0]) || (inGalerie && inGalerie.files[0]);
      if (!fichier) {
        montrerErreur("Veuillez prendre ou sélectionner une photo du sol avant de lancer l'analyse.");
        dropzone.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      
      cacherErreur();
      btn.disabled = true;
      btn.classList.add("loading");
      btnTxt.textContent = "Analyse IA en cours…";

      traitement.then(() => form.submit());
    });
  }

  // Restauration de l'état si retour navigateur
  window.addEventListener("pageshow", () => {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove("loading");
      btnTxt.textContent = TEXTE_BTN_INITIAL;
    }
  });

  // Scroll automatique et fluide vers le résultat
  const resultat = document.getElementById("resultat");
  if (resultat) {
    resultat.scrollIntoView({ behavior: "smooth", block: "start" });
  }
})();
