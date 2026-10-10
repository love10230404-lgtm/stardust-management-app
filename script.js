const navItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");

function showPage(pageId) {
  pages.forEach((page) => {
    page.classList.toggle("active", page.id === pageId);
  });

  navItems.forEach((item) => {
    const isActive = item.dataset.page === pageId;
    item.classList.toggle("active", isActive);
    item.setAttribute("aria-current", isActive ? "page" : "false");
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  history.replaceState(null, "", `#${pageId}`);
}

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    showPage(item.dataset.page);
  });
});

const initialPage = window.location.hash.replace("#", "");
const validPage = [...pages].some((page) => page.id === initialPage);

if (validPage) {
  showPage(initialPage);
} else {
  showPage("schedule");
}
