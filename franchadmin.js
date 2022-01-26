/*****************************************************************************
The JavaScript code from this section will be executed while loading
the current form.

The following predefined variables can be utilized in the code:

fd      - instance of the current form
$       - jQuery object
Dialog  - object for opening and closing dialogs

PnPjs library
https://pnp.github.io/pnpjs/

sp    - sp object from PnPjs:
graph - graph object from PnPjs

Site  - Site function from PnPjs
Web   - Web function from PnPjs

==============================================================================
*/
fd.spRendered(function () {
    // This code is executed once the form is rendered

    // Populating Resolution Date with the current date when a user sets
    // Status field to 'Resolved'
	/*
    fd.field('Status').$on('change', function (value) {
        if (value === 'Resolved') {
            fd.field('ResolutionDate').value = new Date();
        }
    })
	*/
	console.log("worked");
});
/*
fd.spBeforeSave(function () {
    // This code is exeuted before saving the form and
    // may return Promise. The saving does not proceed until
    // the Promise is resolved. If the Promise is rejected,
    // the saving interrupts. This is the appropriate place
    // for adding custom validation.

    // Prevent saving if Status is set to 'Resolved' but
    // Comments field is empty
    if (fd.field('Status').value === 'Resolved' &&
        !fd.field('Comments').value) {
        throw Error('Please leave a comment.');
    }
});

fd.spSaved(function (result) {
    // This code is executed after saving the form
});

*****************************************************************************/
