function field(label, type, name, autocomplete, placeholder = "") {
  const wrapper = document.createElement("label");
  wrapper.className = "auth-field";
  const title = document.createElement("span");
  title.textContent = label;
  const input = document.createElement("input");
  input.type = type;
  input.name = name;
  input.autocomplete = autocomplete;
  input.placeholder = placeholder;
  input.required = true;
  wrapper.append(title, input);
  return { wrapper, input };
}

function submitButton(label) {
  const button = document.createElement("button");
  button.type = "submit";
  button.className = "button button-primary auth-submit";
  button.textContent = label;
  return button;
}

export function createAuthController(options) {
  const { auth, modal, notifications } = options;
  const dock = document.querySelector("#authDock");
  const loginButton = document.querySelector("#authLogin");
  const registerButton = document.querySelector("#authRegister");

  function showError(message) {
    modal.showError(message || "Une erreur est survenue.");
  }

  function setBusy(form, busy) {
    for (const element of form.elements) element.disabled = busy;
    form.setAttribute("aria-busy", String(busy));
  }

  function openLogin() {
    const { body, footer } = modal.show("Connexion", "Retrouvez votre compte Familier Tracker.");
    const form = document.createElement("form");
    form.className = "auth-form";
    const identifier = field("Email ou pseudo", "text", "identifier", "username", "Votre email ou pseudo");
    const password = field("Mot de passe", "password", "password", "current-password", "Minimum 8 caractères");
    const submit = submitButton("Se connecter");
    const forgot = document.createElement("button");
    forgot.type = "button";
    forgot.className = "auth-link";
    forgot.textContent = "Mot de passe oublié ?";
    forgot.addEventListener("click", openForgotPassword);
    form.append(identifier.wrapper, password.wrapper, forgot, submit);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setBusy(form, true);
      try {
        await auth.login(identifier.input.value.trim(), password.input.value);
        modal.close();
        notifications.success("Connexion réussie.");
      } catch (error) {
        showError(error.message);
      } finally {
        setBusy(form, false);
      }
    });
    body.append(form);
    const switchButton = document.createElement("button");
    switchButton.type = "button";
    switchButton.className = "button button-accent";
    switchButton.textContent = "Créer un compte";
    switchButton.addEventListener("click", openRegister);
    footer.append(switchButton);
    queueMicrotask(() => identifier.input.focus());
  }

  function openRegister() {
    const { body, footer } = modal.show("Inscription", "Créez votre compte et confirmez votre adresse email.");
    const form = document.createElement("form");
    form.className = "auth-form";
    const pseudo = field("Pseudo", "text", "pseudo", "username", "3 à 24 caractères");
    const email = field("Email", "email", "email", "email", "adresse@email.fr");
    const password = field("Mot de passe", "password", "password", "new-password", "Minimum 8 caractères");
    const submit = submitButton("Créer le compte");
    form.append(pseudo.wrapper, email.wrapper, password.wrapper, submit);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setBusy(form, true);
      try {
        await auth.register(pseudo.input.value.trim(), email.input.value.trim(), password.input.value);
        const result = modal.show("Vérifiez votre email", "Votre compte a bien été créé.");
        const notice = document.createElement("div");
        notice.className = "auth-success";
        notice.innerHTML = "<strong>Email envoyé</strong><span>Ouvrez le lien reçu pour activer votre compte V2 et vous connecter automatiquement.</span>";
        result.body.append(notice);
        const close = document.createElement("button");
        close.type = "button";
        close.className = "button button-neutral";
        close.textContent = "Fermer";
        close.addEventListener("click", modal.close);
        result.footer.append(close);
      } catch (error) {
        showError(error.message);
        setBusy(form, false);
      }
    });
    body.append(form);
    const switchButton = document.createElement("button");
    switchButton.type = "button";
    switchButton.className = "button button-neutral";
    switchButton.textContent = "J'ai déjà un compte";
    switchButton.addEventListener("click", openLogin);
    footer.append(switchButton);
    queueMicrotask(() => pseudo.input.focus());
  }

  function openForgotPassword() {
    const { body, footer } = modal.show("Mot de passe oublié", "Recevez un lien sécurisé valable une heure.");
    const form = document.createElement("form");
    form.className = "auth-form";
    const identifier = field("Email ou pseudo", "text", "identifier", "username", "Votre email ou pseudo");
    const submit = submitButton("Envoyer le lien");
    form.append(identifier.wrapper, submit);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setBusy(form, true);
      try {
        const result = await auth.requestPasswordReset(identifier.input.value.trim());
        modal.close();
        notifications.success(result.message || "Si le compte existe, un email a été envoyé.");
      } catch (error) {
        showError(error.message);
      } finally {
        setBusy(form, false);
      }
    });
    body.append(form);
    const back = document.createElement("button");
    back.type = "button";
    back.className = "button button-neutral";
    back.textContent = "Retour";
    back.addEventListener("click", openLogin);
    footer.append(back);
    queueMicrotask(() => identifier.input.focus());
  }

  function openResetPassword(token) {
    const { body } = modal.show("Nouveau mot de passe", "Choisissez un nouveau mot de passe pour votre compte.");
    const form = document.createElement("form");
    form.className = "auth-form";
    const password = field("Nouveau mot de passe", "password", "newPassword", "new-password", "Minimum 8 caractères");
    const confirm = field("Confirmer le mot de passe", "password", "confirmPassword", "new-password", "Saisissez-le à nouveau");
    const submit = submitButton("Enregistrer et me connecter");
    form.append(password.wrapper, confirm.wrapper, submit);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (password.input.value !== confirm.input.value) return showError("Les mots de passe ne correspondent pas.");
      setBusy(form, true);
      try {
        await auth.confirmPasswordReset(token, password.input.value);
        clearAuthQuery("resetToken");
        modal.close();
        notifications.success("Mot de passe modifié. Vous êtes connecté.");
      } catch (error) {
        showError(error.message);
      } finally {
        setBusy(form, false);
      }
    });
    body.append(form);
    queueMicrotask(() => password.input.focus());
  }

  function clearAuthQuery(name) {
    const url = new URL(globalThis.location.href);
    url.searchParams.delete(name);
    globalThis.history.replaceState(null, "", url.toString());
  }

  async function processUrlTokens() {
    const params = new URLSearchParams(globalThis.location.search);
    const verificationToken = params.get("verifyToken");
    const resetToken = params.get("resetToken");
    if (verificationToken) {
      modal.show("Activation du compte", "Validation de votre adresse email en cours...");
      try {
        await auth.confirmEmail(verificationToken);
        clearAuthQuery("verifyToken");
        modal.close();
        notifications.success("Email confirmé. Vous êtes connecté.");
      } catch (error) {
        showError(error.message);
      }
      return;
    }
    if (resetToken) openResetPassword(resetToken);
  }

  function render(state) {
    const connected = !!state.user;
    loginButton.hidden = connected;
    registerButton.hidden = connected;
    dock.querySelector(".auth-account")?.remove();
    if (!connected) return;
    const account = document.createElement("div");
    account.className = "auth-account";
    const identity = document.createElement("span");
    identity.className = "auth-identity";
    const pseudo = document.createElement("strong");
    pseudo.textContent = state.user.pseudo;
    const role = document.createElement("small");
    role.textContent = state.user.role === "admin" ? "Admin" : state.user.role === "moderator" ? "Modérateur" : "Utilisateur";
    identity.append(pseudo, role);
    const logout = document.createElement("button");
    logout.type = "button";
    logout.className = "button button-neutral";
    logout.textContent = "Déconnexion";
    logout.addEventListener("click", async () => {
      try {
        await auth.logout();
        notifications.info("Vous êtes déconnecté.");
      } catch (error) {
        notifications.error(error.message);
      }
    });
    account.append(identity, logout);
    dock.append(account);
  }

  loginButton.addEventListener("click", openLogin);
  registerButton.addEventListener("click", openRegister);
  const unsubscribe = auth.subscribe(render);

  return Object.freeze({ openLogin, openRegister, processUrlTokens, destroy: unsubscribe });
}
