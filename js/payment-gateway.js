// Tab switch logic
const gcashTab = document.getElementById("gcash-tab");
const cashTab = document.getElementById("cash-tab");

const gcashContent = document.getElementById("gcash-content");
const cashContent = document.getElementById("cash-content");

gcashTab.addEventListener("click", () => {
  gcashTab.classList.add("active");
  cashTab.classList.remove("active");
  gcashContent.classList.remove("hidden");
  cashContent.classList.add("hidden");
});

cashTab.addEventListener("click", () => {
  cashTab.classList.add("active");
  gcashTab.classList.remove("active");
  cashContent.classList.remove("hidden");
  gcashContent.classList.add("hidden");
});
