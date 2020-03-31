const CLI_LOGIN_RETRY_COUNT = 3;

$(document).ready(function () {
    let url = new URL(location.href);
    let instanceName = url.searchParams.get("name");

    setInstanceSelections(instanceName);
    fetchAnInstance(instanceName)
        .then(loadAllInfo);

    $("#sync-stacks-icon").on("click", (e) => {
        if (e.target.getAttribute("class") == "icon-active") {
            let instanceName = getActiveInstanceName();
            emptyTable();
            syncStacks(instanceName);
        }
    });

    $("#stack-table-body").on("click", ".deactivate-stack-icon", e => {
        let $event = $(e.currentTarget);
        let name = $event.data("stackname");
        let version = $event.data("stackversion");
        $("#modal-stack-name").text(name);
        $("#modal-stack-version").text(version);
    });

    $("#modal-confirm-deactivation").on("click", () => {
        let name = $("#modal-stack-name").text();
        let version = $("#modal-stack-version").text();
        emptyTable();
        deactivateStack(name, version);
    });
    
});

function loadAllInfo(instanceJSON){
    if (typeof instanceJSON === "undefined") {
        console.log("instance data is undefined, cannot load instance");
        return;
    }

    displayDigest(instanceJSON);

    let instanceName = instanceJSON.metadata.name;

    handleInitialCLIAuth(instanceName)
        .then(handleStacksRequests);
}

function handleStacksRequests(instanceName) {
    if(!instanceName){
        return;
    }

    getStacksData(instanceName);
    getCliVersion(instanceName);
}

function getStacksData(instanceName) {
    if (typeof instanceName === "undefined") {
        return;
    }
    return fetch(`/api/auth/kabanero/${instanceName}/stacks`)
        .then(function (response) {
            return response.json();
        })
        .then(updateStackView)
        .catch(error => console.error("Error getting stacks", error));
}

function getCliVersion(instanceName) {
    if (typeof instanceName === "undefined") {
        return;
    }
    return fetch(`/api/auth/kabanero/${instanceName}/stacks/version`)
        .then(function (response) {
            return response.json();
        })
        .then(setCLIVersion)
        .catch(error => console.error("Error getting CLI Version", error));
}

function deactivateStack(name, version) {
    let instanceName = getActiveInstanceName();

    return fetch(`/api/auth/kabanero/${instanceName}/stacks/${name}/versions/${version}`, { method: "DELETE" })
        .then(function (response) {
            return response.json();
        })
        .then(handleInstancesRequests)
        .catch(error => console.error(`Error deactivating ${name} ${version} stack`, error));
}

function syncStacks(instanceName) {
    if (typeof instanceName === "undefined") {
        return;
    }
    return fetch(`/api/auth/kabanero/${instanceName}/stacks/sync`, { method: "PUT" })
        .then(handleInstancesRequests)
        .catch(error => console.error("Error syncing stacks", error));
}

function updateStackView(stackJSON) {
    if (typeof stackJSON === "undefined") {
        return;
    }

    // yaml metadata in kube, cannot be deactivated and has no status.
    let curatedStacks = stackJSON["curated stacks"];

    // difference between kabanero stacks and curated stacks. 
    // If there are stacks in this array then a "sync" needs to happen to pull them into kabanero
    let newCuratedStacks = stackJSON["new curated stacks"];

    let kabaneroStacks = stackJSON["kabanero stacks"];

    // when a stack yaml is deleted from the cluter, but it’s still out on Kabanero. A sync will clean these up.
    let obsoleteStacks = stackJSON["obsolete stacks"];

    kabaneroStacks.forEach(stack => {
        $("#stack-table-body").append(createKabaneroStackRow(stack));
    });

    curatedStacks.forEach(stack => {
        $("#curated-stack-table-body").append(createCuratedStackRow(stack));
    });

    function createKabaneroStackRow(stack) {
        let rows = [];
        let versions = stack.status;

        versions.forEach(version => {
            let name = $("<td>").text(stack.name);
            let versionTD = $("<td>").text(version.version);
            let statusTD = $("<td>").text(version.status);
            let deactivateStack = createDeactivateStackButton(stack.name, version);
            let row = $("<tr>").append([name, versionTD, statusTD, deactivateStack]);
            rows.push(row);
        });
        return rows;
    }

    function createCuratedStackRow(stack) {
        let rows = [];
        let versions = stack.versions;

        versions.forEach(version => {
            let name = $("<td>").text(stack.name);
            let versionTD = $("<td>").text(version.version);
            let images = version.images.reduce((acc, imageObj) => {
                return acc += `${imageObj.image}<br/>`;
            }, "");

            let imagesTD = $("<td>").html(images);
            let row = $("<tr>").append([name, versionTD, imagesTD]);
            rows.push(row);
        });
        return rows;
    }

    function createDeactivateStackButton(stackName, versionObj) {
        let iconStatus = versionObj.status === "active" ? "icon-active" : "icon-disabled";
        let deactivateStack = $("<td>").addClass("deactivate-stack-td");

        let div = $("<div>").addClass(`deactivate-stack-icon ${iconStatus}`)
            .data("stackname", stackName)
            .data("stackversion", versionObj.version)
            .attr("data-modal-target", `#deactivate-stack-modal-${iconStatus}`);

        let svg = `<svg focusable="false" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 32 32" aria-hidden="true" style="will-change: transform;"><path d="M16,4A12,12,0,1,1,4,16,12,12,0,0,1,16,4m0-2A14,14,0,1,0,30,16,14,14,0,0,0,16,2Z"></path><path d="M10 15H22V17H10z"></path><title>Deactivate ${stackName} - ${versionObj.version} stack</title></svg>`;

        div.append(svg);
        return deactivateStack.append(div);
    }

    $(".table-loader").hide();
    $("#stack-table").show();
    $("#curated-stack-table").show();
}

function setCLIVersion(cliVersion) {
    if (typeof cliVersion === "undefined") {
        return;
    }
    let version = cliVersion["image"].split(":")[1];
    $("#cli-version").append(version);
}

function emptyTable() {
    $("#stack-table").hide();
    $("#curated-stack-table").hide();
    $(".table-loader").show();
    $("#stack-table-body").empty();
    $("#curated-stack-table-body").empty();
    $("#cli-version").empty();
}

function getURLParam(key) {
    return new URLSearchParams(window.location.search).get(key);
}

function handleInitialCLIAuth(instanceName, retries) {
    retries = typeof retries === "undefined" ? 0 : retries;
    // We use the stacks endpoint to check if a user is logged in on initial page load, if we get a 401 we'll login and retry this route
    // If we get back a 200 we consider ourselves successfully logged in
    return fetch(`/api/auth/kabanero/${instanceName}/stacks`)
        .then(function (response) {
            // Login via cli and retry if 401 is returned on initial call
            if (retries <= CLI_LOGIN_RETRY_COUNT && response.status === 401) {
                return loginViaCLI(instanceName)
                    .then(() => {
                        return handleInitialCLIAuth(instanceName, ++retries);
                    });
            }
            else if (retries >= CLI_LOGIN_RETRY_COUNT){
                console.log("exceeded max retries to login to CLI");
                return;
            }
            else if (response.status !== 200) {
                console.warn(`Initial auth into instance ${instanceName} returned status code: ${response.status}`);
            }

            // pass on instance name var to the next function in the promise chain
            return instanceName;
        })
        .catch(error => console.error(`Error handling initial auth into instance ${instanceName} via CLI server`, error));
}

function loginViaCLI(instanceName) {
    if (typeof instanceName === "undefined") {
        console.warn("CLI login cannot login without an instanceName");
        return;
    }

    return fetch(`/api/auth/kabanero/${instanceName}/stacks/login`, { method: "POST" })
        .catch(error => console.error(`Error logging into instance ${instanceName} via CLI server`, error));
}

function displayDigest(instance){
    if(!instance.spec || !instance.spec.governancePolicy){
        console.log("Failed to get stack govern policy. instance.spec or instance.spec.governancePoliy does not exist.");
        return;
    }
    // The way carbon dropdown works is different than normal select. 
    // This gets the current li that the server says is the current digest, and sets the display to that text.
    // Then it adds the selected class since it doesn't make sense to select the same li that is already the current digest.
    let policy = instance.spec.governancePolicy.stackPolicy;

    $("#stack-govern-dropdown li").show();
    let $currentPolicyLi = $(`#stack-govern-dropdown li[data-value='${policy}']`);
    let translatedPolicyText = $currentPolicyLi.find("a").first().text();
    $("#stack-govern-value").attr("data-value", policy);
    $("#stack-govern-value-text").text(translatedPolicyText);
    $currentPolicyLi.addClass("bx--dropdown--selected");
}
