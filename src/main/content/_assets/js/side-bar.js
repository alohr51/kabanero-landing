// Note: other side-bar functionality is brought in via carbon-components.min.js
$(document).ready(function(){
    handleSideNavScroll();
    setNavLocation();
    loadProductVersion();
});

function handleSideNavScroll() {
    $(window).scroll(function () {
        var $height = $(window).scrollTop();
        setNavLocation($height);
    });
}

function setNavLocation() {
    let height = $(document).scrollTop();

    if (height > 50) {
        $(".bx--side-nav").addClass("scroll");
    }
    else {
        $(".bx--side-nav").removeClass("scroll");
    }
}

function loadProductVersion(){
    fetch("/api/kabanero")
        .then(function(response) {
            return response.json();
        })
        .then(function(installInfo){
            if(installInfo && installInfo.version !== ""){
                $("#product-version-number").text(installInfo.version);
                showAboutIcon();
            }
        })
        .catch(error => console.error("Error getting install info", error));
    
    $("#install-copy-tooltip").on("click", function(){
        let installInfo = $(this).parent().parent().find(".bx--modal-content").text().trim();
        navigator.clipboard.writeText(installInfo);
        $("#install-info-checkmark").fadeIn().delay(1000).fadeOut();
    });

    // only show the modal if there is a version set because this is the only thing shown anyways
    function showAboutIcon(){
        $("#about-side-icon").show();
    }
}