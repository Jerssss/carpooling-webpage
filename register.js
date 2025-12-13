document.addEventListener("DOMContentLoaded", () => {
  console.log("register.js loaded");

  const form = document.querySelector(".registration-form");
  if (!form) return;

  // ===== OCCUPATION-BASED ID NUMBER VISIBILITY =====
  const occupationSelect = document.querySelector("#occupation");
  const idNumberInput = document.querySelector("#idnumber");
  const idNumberGroup = idNumberInput?.closest(".form-group");

  function toggleIdNumberField() {
    if (!occupationSelect || !idNumberGroup) return;

    if (occupationSelect.value === "student") {
      idNumberGroup.style.display = "flex";
      idNumberInput.setAttribute("required", "required");
    } else {
      idNumberGroup.style.display = "none";
      idNumberInput.removeAttribute("required");
      idNumberInput.value = "";     // clear value when hidden
      clearError(idNumberInput);    // remove validation error if any
    }
  }

// run once on load
toggleIdNumberField();

// listen for changes
occupationSelect.addEventListener("change", toggleIdNumberField);


  // ===== STEP WIZARD LOGIC =====
  const steps = Array.from(document.querySelectorAll(".form-step"));
  const prevBtn = document.querySelector(".prev-btn");
  const nextBtn = document.querySelector(".next-btn");
  const submitBtn = document.querySelector(".submit-btn");

  let currentIndex = 0; // 0..steps.length-1

  function showStep(index) {
    if (index < 0) index = 0;
    if (index > steps.length - 1) index = steps.length - 1;
    currentIndex = index;

    // show/hide steps
    steps.forEach((s, i) => {
      if (i === index) s.removeAttribute("hidden");
      else s.setAttribute("hidden", "");
    });

    // update stepper circle active/completed classes
    const stepperSteps = Array.from(document.querySelectorAll(".step"));
    stepperSteps.forEach((sNode, i) => {
      sNode.classList.remove("active", "completed");
      if (i < index) sNode.classList.add("completed");
      if (i === index) sNode.classList.add("active");
    });

    // buttons
    if (index === 0) {
      prevBtn.hidden = true;
      nextBtn.hidden = false;
      submitBtn.hidden = true;
    } else if (index === steps.length - 1) {
      prevBtn.hidden = false;
      nextBtn.hidden = true;
      submitBtn.hidden = false;
    } else {
      prevBtn.hidden = false;
      nextBtn.hidden = false;
      submitBtn.hidden = true;
    }

    // focus first input of the step
    const first = steps[currentIndex].querySelector("input, select, textarea");
    if (first) first.focus();
  }

  // remove stepper clicks — ensure users can't skip steps
  Array.from(document.querySelectorAll(".step")).forEach(el => {
    el.replaceWith(el.cloneNode(true));
  });

  // navigation handlers
  prevBtn.addEventListener("click", () => {
    showStep(currentIndex - 1);
  });

  // ---------- Validation helpers & UI feedback ----------
  function createErrorElement(msg) {
    const span = document.createElement("span");
    span.className = "field-error";
    span.setAttribute("aria-live", "polite");
    span.textContent = msg;
    return span;
  }

  function showError(control, message) {
    if (!control) return;
    clearError(control);

    // Add red highlight
    if (control.type === "file") {
      const wrapper = control.closest(".file-upload-big") || control;
      wrapper.classList.add("input-error");
      const err = createErrorElement(message);
      wrapper.appendChild(err);
    } else {
      control.classList.add("input-error");
      // If control is inside label wrapper or form-group, append after it
      const parent = control.parentElement;
      const err = createErrorElement(message);
      if (parent) parent.appendChild(err);
      else control.insertAdjacentElement("afterend", err);
    }
  }

  function clearError(control) {
    if (!control) return;
    if (control.type === "file") {
      const wrapper = control.closest(".file-upload-big") || control;
      wrapper.classList.remove("input-error");
      const existing = wrapper.querySelector(".field-error");
      if (existing) existing.remove();
    } else {
      control.classList.remove("input-error");
      const parent = control.parentElement;
      if (parent) {
        const existing = parent.querySelector(".field-error");
        if (existing) existing.remove();
      } else {
        const next = control.nextElementSibling;
        if (next && next.classList.contains("field-error")) next.remove();
      }
    }
  }

  // basic validators:
  function validateEmailDomain(email) {
    if (!email) return false;
    // enforce @carpool.com domain
    // NOTE: to change later to @slu.edu.ph, replace allowedDomain value below.
    const allowedDomain = "@carpool.com";
    return email.toLowerCase().endsWith(allowedDomain);
  }

  function validateContactNumber(value) {
    if (!value) return false;
    // Accept either 09XXXXXXXXX (11 digits) or +639XXXXXXXXX (12 digits)
    const pattern1 = /^09\d{9}$/;     // 09xxxxxxxxx
    const pattern2 = /^\+639\d{9}$/;  // +639xxxxxxxxx
    return pattern1.test(value) || pattern2.test(value);
  }

  // validate required inputs in given step element, show inline messages
  function validateStep(stepEl) {
    const controls = Array.from(stepEl.querySelectorAll("input, select, textarea"))
      .filter(i => i.hasAttribute("required"));

    let firstInvalid = null;
    let valid = true;

    controls.forEach(control => {
      clearError(control);

      // file input
      if (control.type === "file") {
        if (control.required && (!control.files || control.files.length === 0)) {
          valid = false;
          if (!firstInvalid) firstInvalid = control;
          showError(control, "Please upload a file.");
        }
        return;
      }

      // select empty
      if (control.tagName.toLowerCase() === "select") {
        if (control.required && (!control.value || control.value.trim() === "")) {
          valid = false;
          if (!firstInvalid) firstInvalid = control;
          showError(control, "Please select an option.");
        }
        return;
      }

      // empty value check
      if (control.required && (!control.value || control.value.trim() === "")) {
        valid = false;
        if (!firstInvalid) firstInvalid = control;
        showError(control, "This field is required.");
        return;
      }

      // Email field validation (specific)
      if (control.type === "email") {
        if (!validateEmailDomain(control.value)) {
          valid = false;
          if (!firstInvalid) firstInvalid = control;
          showError(control, "Email must end with @carpool.com.");
        }
      }

      // contact number validation (specific id "contact")
      if (control.id === "contact") {
        if (!validateContactNumber(control.value.trim())) {
          valid = false;
          if (!firstInvalid) firstInvalid = control;
          showError(control, "Enter a valid PH number (e.g. 09171234567 or +639171234567).");
        }
      }

      // year-model numeric-ish validation (optional)
      if (control.id === "year-model") {
        const y = Number(control.value);
        const nextYear = new Date().getFullYear() + 1;
        if (!/^\d{4}$/.test(control.value) || y < 1900 || y > nextYear) {
          valid = false;
          if (!firstInvalid) firstInvalid = control;
          showError(control, "Enter a valid 4-digit year.");
        }
      }

      // plate-number basic length check (optional)
      if (control.id === "plate-number") {
        if (control.value.trim().length < 4) {
          valid = false;
          if (!firstInvalid) firstInvalid = control;
          showError(control, "Enter a valid plate number.");
        }
      }
    });

    // focus first invalid and return false
    if (!valid && firstInvalid) {
      firstInvalid.focus();
      const wrapper = firstInvalid.closest(".file-upload-big") || firstInvalid;
      wrapper.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    return valid;
  }

  // next button click: validate current step then advance
  nextBtn.addEventListener("click", () => {
    const currentStepEl = steps[currentIndex];

    if (!validateStep(currentStepEl)) {
      return; // do not advance
    }

    showStep(currentIndex + 1);
  });

  // init
  showStep(0);

  // ==== FILE NAME PREVIEW & input listeners =====
  const fileInputs = document.querySelectorAll(".file-upload-big input[type='file']");
  fileInputs.forEach(input => {
    input.addEventListener("change", () => {
      const file = input.files[0];
      const labelSpan = input.parentElement.querySelector(".file-label");

      if (file) {
        labelSpan.innerHTML = `<strong class="file-selected">${file.name}</strong>`;
        clearError(input);
      } else {
        const defaultText = input.getAttribute("data-default-text") || labelSpan.getAttribute("data-default") || labelSpan.textContent;
        labelSpan.innerHTML = `<img src="../9467_it312-teamarc_midtermproject/images/uploadimage.png" alt="Upload Icon"> ${defaultText}`;
      }
    });

    // store default text for potential restoration
    const lbl = input.parentElement.querySelector(".file-label");
    if (lbl && !lbl.getAttribute("data-default")) {
      lbl.setAttribute("data-default", lbl.textContent.trim());
    }

    // clear error when user selects a file
    input.addEventListener("input", () => clearError(input));
  });

  // Clear invalid highlight on typing/selecting for all inputs
  const allControls = form.querySelectorAll("input, select, textarea");
  allControls.forEach(ctrl => {
    ctrl.addEventListener("input", () => clearError(ctrl));
    ctrl.addEventListener("change", () => clearError(ctrl));
  });

  // ===== FORM SUBMIT =====
  form.addEventListener("submit", async e => {
    e.preventDefault();

    // final validation: ensure all steps valid and password match
    for (let i = 0; i < steps.length; i++) {
      const ok = validateStep(steps[i]);
      if (!ok) {
        showStep(i);
        return;
      }
    }

    // password match
    const pwd = form.querySelector("#password").value || "";
    const conf = form.querySelector("#confirm-password").value || "";
    if (pwd !== conf) {
      const pwEl = form.querySelector("#password");
      const confEl = form.querySelector("#confirm-password");
      showError(pwEl, "Passwords do not match.");
      showError(confEl, "Passwords do not match.");
      confEl.focus();
      return;
    }

    // files present check (redundant but explicit)
    const requiredFilesMissing = Array.from(form.querySelectorAll("input[type='file'][required]"))
      .some(i => i.files.length === 0);
    if (requiredFilesMissing) {
      alert("Please upload all required documents.");
      return;
    }

    // All good -> submit
    const formData = new FormData(form);
    const roleType = document.body.dataset.role;
    formData.append("roleType", roleType);

    try {
      const res = await fetch("/9467_it312-teamarc_midtermproject/register_user.php", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      alert(data.message);

      if (data.success) {
        const projectFolder = "/9467_it312-teamarc_midtermproject";
        window.location.href = `${projectFolder}/login.html`;
      }

    } catch (err) {
      alert("Registration failed.");
      console.error(err);
    }
  });
});
