describe('Employees information testing', () => {
  beforeEach(() => {
    cy.visit('http://172.16.35.48:3000/employees/manage-employees');
  });

  it('2.should fill out the employee form', () => {
    const fileName1 = 'perfor.jpg';
    cy.get('#createUserButton').click();
    cy.get('#dependencies_profileImage', { timeout: 10000 }).attachFile(
      fileName1,
      { force: true },
    );

    cy.get('#dependencies_userFirstName').type('a');
    cy.get('[id="dependencies_userFirstName_help"]').should(
      'contain.text',
      'name must be between 3 and 20 characters long.',
    );
    cy.get('#dependencies_userFirstName').type('abrha');

    cy.get('#dependencies_userMiddleName').type('ka');
    cy.get('[id="dependencies_userMiddleName_help"]').should(
      'contain.text',
      'Middle Name must be between 3 and 20 characters long.',
    );
    cy.get('#dependencies_userMiddleName').type('kahsay');

    cy.get('#dependencies_userLastName').type('ef');
    cy.get('[id="dependencies_userLastName_help"]').should(
      'contain.text',
      'Last Name must be between 3 and 20 characters long.',
    );
    cy.get('#dependencies_userLastName').type('efrem');

    cy.get('#dependencies_userEmail').type('abirha182gmail.com');
    cy.get('[ id="dependencies_userEmail_help"]').should(
      'contain.text',
      'Invalid email format. Email must contain only one dot after @.',
    );
    cy.get('#dependencies_userEmail').type('abirha182@gmail.com');
    cy.get('#dependencies_employeeGender').click();
    cy.get('.ant-select-item-option-content').contains('Female').click();
    cy.get('#dependencies_dateOfBirth').type('2024-08-15');

    cy.get('#dependencies_nationalityId').click();
    cy.get('.ant-select-item-option-content').contains('Ethiopian').click();

    cy.get('#dependencies_maritalStatus').click();
    cy.get('.ant-select-item-option-content').contains('Married').click();

    //adress
    cy.get('#dependencies_address_addressCountry').type('Et');
    cy.get('[id="dependencies_address_addressCountry_help"]').should(
      'contain.text',
      'country must be between 3 and 20 characters long.',
    );
    cy.get('#dependencies_address_addressCountry').type('Ethiopia');

    cy.get('#dependencies_address_addressCity').type('A');
    cy.get('[id="dependencies_address_addressCity_help"]').should(
      'contain.text',
      'city must be between 3 and 20 characters long.',
    );
    cy.get('#dependencies_address_addressCity').type('Addis ababa');

    // Add custom field
    // cy.get('#Address').click();

    cy.contains('button', 'Add Custom Field').click({ force: true });
    cy.get('#fieldName').type('newinput8');
    cy.get('#fieldType').click({ force: true });
    cy.get('.ant-select-item-option-content')
      .contains('Input')
      .click({ force: true });
    //cy.get('#isActive').click();
    cy.contains('button', 'Add Field').click({ force: true });
    cy.window().then((win) => {
      const x = win.innerWidth - 10;
      const y = win.innerHeight / 2;
      cy.get('body').click(x, y);
    });

    cy.wait(1000);
    cy.get('#dependencies_address_newinput8')
      .should('be.visible')
      .type('Test input');

    //   // cy.get('#Address').click();
    //   cy.contains('button', 'Add Custom Field').click({force: true});
    //   cy.get('#fieldName').type('DatePicker');
    //   cy.get('#fieldType').click({ force: true });
    //   cy.get('.ant-select-item-option-content').contains('Date Picker').click();
    //  // cy.get('#isActive').click();
    //   cy.contains('button', 'Add Field').click();
    //   cy.window().then((win) => {
    //     const x = win.innerWidth - 10;
    //     const y = win.innerHeight / 2;
    //     cy.get('body').click(x, y);
    //   });

    // const fieldId2 = 'dependencies_address_DatePicker';
    //  cy.get(`#${fieldId2}`).should('exist');
    //  cy.get(`#${fieldId2}`).type('2024-08-15');

    //   // cy.get('#Address').click();
    //   cy.contains('button', 'Add Custom Field').click({force: true});
    //   cy.get('#fieldName').type('Toggleinput');
    //   cy.get('#fieldType').click({ force: true });
    //   cy.get('.ant-select-item-option-content').contains('Toggle').click();
    //  // cy.get('#isActive').click();
    //   cy.contains('button', 'Add Field').click();
    //   cy.window().then((win) => {
    //     const x = win.innerWidth - 10;
    //     const y = win.innerHeight / 2;
    //     cy.get('body').click(x, y);
    //   });

    // const fieldId3 = 'dependencies_address_Toggleinput';
    // cy.get(`#${fieldId3}`).should('exist');
    // cy.get(`#${fieldId3}`).click();

    //   // cy.get('#Address').click();
    //   cy.contains('button', 'Add Custom Field').click({force: true});
    //   cy.get('#fieldName').type('Checkbox');
    //   cy.get('#fieldType').click({ force: true });
    //   cy.get('.ant-select-item-option-content').contains('Checkbox').click();
    // //  cy.get('#isActive').click();
    //   cy.contains('button', 'Add Field').click();
    //   cy.window().then((win) => {
    //     const x = win.innerWidth - 10;
    //     const y = win.innerHeight / 2;
    //     cy.get('body').click(x, y);
    //   });

    //   cy.get('#Address').click();
    //   cy.get('#fieldName').type('Select');
    //   cy.get('#fieldType').click({ force: true });
    //   cy.get('.ant-select-item-option-content').contains('Select').click();
    //  // cy.get('#isActive').click();
    //   cy.contains('button', 'Add Option').click();
    //   cy.get('input[placeholder="Option 1"]')
    //   .type('option 1', { force: true });
    //   cy.contains('button', 'Add Option').click();
    //   cy.get('input[placeholder="Option 2"]')
    //   .type('option 2', { force: true });

    // const selectFieldId4 = 'dependencies_address_Select';
    // cy.get(`#${selectFieldId4}`).should('exist');
    // cy.get('#${selectFieldId4}').click();
    // cy.get('.ant-select-item-option-content').contains('option 2').click({force:true});

    //   cy.contains('button', 'Add Field').click();
    //   cy.window().then((win) => {
    //     const x = win.innerWidth - 10;
    //     const y = win.innerHeight / 2;
    //     cy.get('body').click(x, y);
    //   });

    cy.get('#dependencies_emergencyContact_emergencyContactFullName').type('a');
    cy.get(
      '[id="dependencies_emergencyContact_emergencyContactFullName_help"]',
    ).should(
      'contain.text',
      'Full Name must be between 3 and 20 characters long.',
    );
    cy.get('#dependencies_emergencyContact_emergencyContactFullName').type(
      'abrkah',
    );

    cy.get('#dependencies_emergencyContact_emergencyContactLastName').type(
      'kA',
    );
    cy.get(
      '[id="dependencies_emergencyContact_emergencyContactLastName_help"]',
    ).should(
      'contain.text',
      'Last Name must be between 3 and 20 characters long.',
    );
    cy.get('#dependencies_emergencyContact_emergencyContactLastName').type(
      'kahabr',
    );

    cy.get('#dependencies_emergencyContact_emergencyContactEmailAddress').type(
      'abirha182gmail.com',
    );
    cy.get(
      '[id="dependencies_emergencyContact_emergencyContactEmailAddress_help"]',
    ).should(
      'contain.text',
      'Invalid email format. Email must contain only one dot after @.',
    );
    cy.get('#dependencies_emergencyContact_emergencyContactEmailAddress').type(
      'abirha182@gmail.com',
    );

    cy.get('#dependencies_emergencyContact_emergencyContactGender').click({
      force: true,
    });
    cy.get('.ant-select-item-option-content')
      .contains('Male')
      .click({ force: true });
    cy.get('#dependencies_emergencyContact_emergencyContactDateOfBirth').type(
      '2024-08-15',
    );

    cy.get(
      '#dependencies_emergencyContact_emergencyContactNationality',
    ).click();
    cy.get('.ant-select-item-option-content')
      .contains('Ethiopian')
      .click({ force: true });

    // Add custom field

    cy.get('[id="addCustomFieldemergencyContact"]').click();
    cy.get('#fieldName').type('input2', { force: true });
    cy.get('#fieldType').click({ force: true });
    cy.get('.ant-select-item-option-content')
      .contains('Input')
      .click({ force: true });
    //cy.get('#isActive').click();

    cy.get('#addFieldemergencyContact').click({ force: true });
    cy.contains('button', 'Add Field').click();
    cy.window().then((win) => {
      const x = win.innerWidth - 10;
      const y = win.innerHeight / 2;
      cy.get('body').click(x, y);
    });

    cy.wait(1000);
    cy.get('#dependencies_emergencyContact_input2').type('Test input');

    //   cy.get('[id="Emergency contact"]').click();
    //   cy.get('#fieldName').type('DatePickerem');
    //   cy.get('#fieldType').click({ force: true });
    //   cy.get('.ant-select-item-option-content').contains('Date Picker').click();
    //  // cy.get('#isActive').click();
    //   cy.contains('button', 'Add Field').click();
    //   cy.window().then((win) => {
    //     const x = win.innerWidth - 10;
    //     const y = win.innerHeight / 2;
    //     cy.get('body').click(x, y);
    //   });
    // const fieldId7 = 'dependencies_emergencyContact_DatePickerem';
    // cy.get(`#${fieldId7}`).should('exist');
    // cy.get(`#${fieldId7}`).type('2024-08-15');
    //   cy.get('[id="Emergency contact"]').click({ force: true });
    //   cy.get('#fieldName').type('Toggleinputem');
    //   cy.get('#fieldType').click({ force: true });
    //   cy.get('.ant-select-item-option-content').contains('Toggle').click();
    //  // cy.get('#isActive').click();
    //   cy.contains('button', 'Add Field').click();
    //   cy.window().then((win) => {
    //     const x = win.innerWidth - 10;
    //     const y = win.innerHeight / 2;
    //     cy.get('body').click(x, y);
    //   });

    // const fieldId8 = 'dependencies_emergencyContact_Toggleinputem';
    // cy.get(`#${fieldId8}`).should('exist');
    // cy.get(`#${fieldId8}`).click();

    //   cy.get('[id="Emergency contact"]').click({ force: true });
    //   cy.get('#fieldName').type('Checkbox');
    //   cy.get('#fieldType').click({ force: true });
    //   cy.get('.ant-select-item-option-content').contains('Checkbox').click();
    // //  cy.get('#isActive').click();
    //   cy.contains('button', 'Add Field').click();
    //   cy.window().then((win) => {
    //     const x = win.innerWidth - 10;
    //     const y = win.innerHeight / 2;
    //     cy.get('body').click(x, y);
    //   });

    //   cy.get('[id="Emergency contact"]').click({ force: true });
    //   cy.get('#fieldName').type('Selectem');
    //   cy.get('#fieldType').click({ force: true });
    //   cy.get('.ant-select-item-option-content').contains('Select').click();
    //  // cy.get('#isActive').click();
    //   cy.contains('button', 'Add Option').click();
    //   cy.get('input[placeholder="Option 1"]')
    //   .type('option 1', { force: true });
    //   cy.contains('button', 'Add Option').click();
    //   cy.get('input[placeholder="Option 2"]')
    //   .type('option 2', { force: true });

    //   cy.contains('button', 'Add Field').click();
    //   cy.window().then((win) => {
    //     const x = win.innerWidth - 10;
    //     const y = win.innerHeight / 2;
    //     cy.get('body').click(x, y);
    //   });
    // const selectFieldId9 = 'dependencies_emergencyContact_Selectem';
    // cy.get(`#${selectFieldId9}`).should('exist');
    // cy.get('#${selectFieldId9}').click();
    // cy.get('.ant-select-item-option-content').contains('option 2').click({force:true});

    cy.get('#dependencies_bankInformation_bankName').type('Ab');
    cy.get('[id="dependencies_bankInformation_bankName_help"]').should(
      'contain.text',
      'Bank Name must be between 3 and 20 characters long.',
    );
    cy.get('#dependencies_bankInformation_bankName').type('Abiysinia');

    cy.get('#dependencies_bankInformation_branch').type('b');
    cy.get('[ id="dependencies_bankInformation_branch_help"]').should(
      'contain.text',
      'Branch must be between 3 and 20 characters long.',
    );
    cy.get('#dependencies_bankInformation_branch').type('bole');

    cy.get('[id="dependencies_bankInformation_accountName"]').type('aC');
    cy.get('[id="dependencies_bankInformation_accountName_help"]').should(
      'contain.text',
      'Account Name must be between 3 and 20 characters long.',
    );
    cy.get('[id="dependencies_bankInformation_accountName"]').type('abr');
    cy.get('#dependencies_bankInformation_accountNumber').type('1000012121212');

    //Add custom field

    cy.get('[id="addCustomFieldbank information"]').click({ force: true });
    cy.contains('button', 'Add Custom Field').click();
    cy.get('#fieldName').type('input2');
    cy.get('#fieldType').click({ force: true });
    cy.get('.ant-select-item-option-content')
      .contains('Input')
      .click({ force: true });
    //cy.get('#isActive').click();
    cy.contains('button', 'Add Field').click();
    cy.window().then((win) => {
      const x = win.innerWidth - 10;
      const y = win.innerHeight / 2;
      cy.get('body').click(x, y);
    });

    cy.wait(1000);
    cy.get('#dependencies_bankInformation_input2').type('Test input');

    //   cy.get('[id="Bank information"]').click({ force: true });
    //   cy.get('#fieldName').type('Date Picker');
    //   cy.get('#fieldType').click({ force: true });
    //   cy.get('.ant-select-item-option-content').contains('Date Picker').click();
    //  // cy.get('#isActive').click();
    //   cy.contains('button', 'Add Field').click();
    //   cy.window().then((win) => {
    //     const x = win.innerWidth - 10;
    //     const y = win.innerHeight / 2;
    //     cy.get('body').click(x, y);
    //   });
    // const fieldId11 = 'dependencies_address_DatePickerba';
    // cy.get(`#${fieldId11}`).should('exist');
    // cy.get(`#${fieldId11}`).type('2024-08-15');
    //   cy.get('[id="Bank information"]').click({ force: true });
    //   cy.get('#fieldName').type('Toggleinputba');
    //   cy.get('#fieldType').click({ force: true });
    //   cy.get('.ant-select-item-option-content').contains('Toggle').click();
    //  // cy.get('#isActive').click();
    //   cy.contains('button', 'Add Field').click();
    //   cy.window().then((win) => {
    //     const x = win.innerWidth - 10;
    //     const y = win.innerHeight / 2;
    //     cy.get('body').click(x, y);
    //   });

    // const fieldId12 = 'dependencies_address_Toggleinputba';
    // cy.get(`#${fieldId12}`).should('exist');
    // cy.get(`#${fieldId12}`).click();

    //   cy.get('[id="Bank information"]').click({ force: true });
    //   cy.get('#fieldName').type('Checkbox');
    //   cy.get('#fieldType').click({ force: true });
    //   cy.get('.ant-select-item-option-content').contains('Checkbox').click();
    // //  cy.get('#isActive').click();
    //   cy.contains('button', 'Add Field').click();
    //   cy.window().then((win) => {
    //     const x = win.innerWidth - 10;
    //     const y = win.innerHeight / 2;
    //     cy.get('body').click(x, y);
    //   });

    //   cy.get('[id="Bank information"]').click({ force: true });
    //   cy.get('#fieldName').type('Selectba');
    //   cy.get('#fieldType').click({ force: true });
    //   cy.get('.ant-select-item-option-content').contains('Select').click();
    //  // cy.get('#isActive').click();
    //   cy.contains('button', 'Add Option').click();
    //   cy.get('input[placeholder="Option 1"]')
    //   .type('option 1', { force: true });
    //   cy.contains('button', 'Add Option').click();
    //   cy.get('input[placeholder="Option 2"]')
    //   .type('option 2', { force: true });

    //   cy.contains('button', 'Add Field').click();
    //   cy.window().then((win) => {
    //     const x = win.innerWidth - 10;
    //     const y = win.innerHeight / 2;
    //     cy.get('body').click(x, y);
    //   });

    // const selectFieldId13 = 'dependencies_address_Selectba';
    // cy.get(`#${selectFieldId13}`).should('exist');
    // cy.get('#${selectFieldId13}').click();
    // cy.get('.ant-select-item-option-content').contains('option 2').click({force:true});

    cy.contains('button', 'Save and Continue').click();

    cy.get('#dependencies_joinedDate').type('2024-02-15');
    cy.get('#dependencies_jobTitle').type('de', { force: true });
    cy.get('[id="dependencies_jobTitle_help"]').should(
      'contain.text',
      'job title must be between 3 and 20 characters long.',
    );
    cy.get('#dependencies_jobTitle').type('developer', { force: true });

    cy.get('#dependencies_employmentTypeId').click({ force: true });
    cy.get('.ant-select-item-option-content').contains('Permanent').click();

    cy.get('#dependencies_departmentId').click();
    cy.get('.ant-select-item-option-content')
      .contains('Software Solutions')
      .click();

    cy.get('#dependencies_branchId').click();
    cy.get('.ant-select-item-option-content').contains('HQ').click();
    cy.get('#dependencies_departmentLeadOrNot').click();
    cy.get('input.ant-radio-input[value="Permanent"]').check();

    // Role Permission
    cy.get('#dependencies_roleId').click();
    cy.get('.ant-select-item-option-content')
      .contains('admin role for tenant id 1')
      .click();

    cy.get('#dependencies_workScheduleId').click();
    cy.get('.ant-select-item-option-content').contains('kjh').click();

    // PAGE3
    cy.get('#sidebarActionSubmitAndContinue1').click({ force: true });

    // Add custom field

    cy.contains('button', 'Add Custom Field').click({ force: true });
    cy.get('#fieldName').type('input2');
    cy.get('#fieldType').click({ force: true });
    cy.get('.ant-select-item-option-content')
      .contains('Input')
      .click({ force: true });
    //cy.get('#isActive').click();
    cy.contains('button', 'Add Field').click();
    cy.window().then((win) => {
      const x = win.innerWidth - 10;
      const y = win.innerHeight / 2;
      cy.get('body').click(x, y);
    });

    cy.wait(1000);
    cy.get('#dependencies_additionalInformation_input2').type('Test input');

    //  cy.contains('button', 'Add Custom Field').click({force: true});
    //   cy.get('#fieldName').type('DatePicker');
    //   cy.get('#fieldType').click({ force: true });
    //   cy.get('.ant-select-item-option-content').contains('Date Picker').click();
    //  // cy.get('#isActive').click();
    //   cy.contains('button', 'Add Field').click();
    //   cy.window().then((win) => {
    //     const x = win.innerWidth - 10;
    //     const y = win.innerHeight / 2;
    //     cy.get('body').click(x, y);
    //   });

    // const fieldId15 = 'dependencies_additionalInformation_DatePicker';
    //  cy.get(`#${fieldId15}`).should('exist');
    //  cy.get(`#${fieldId15}`).type('2024-08-15');

    //  cy.contains('button', 'Add Custom Field').click({force: true});
    //   cy.get('#fieldName').type('Toggleinput');
    //   cy.get('#fieldType').click({ force: true });
    //   cy.get('.ant-select-item-option-content').contains('Toggle').click();
    //  // cy.get('#isActive').click();
    //   cy.contains('button', 'Add Field').click();
    //   cy.window().then((win) => {
    //     const x = win.innerWidth - 10;
    //     const y = win.innerHeight / 2;
    //     cy.get('body').click(x, y);
    //   });

    // const fieldId16 = 'dependencies_additionalInformation_Toggleinput';
    // cy.get(`#${fieldId16}`).should('exist');
    // cy.get(`#${fieldId16}`).click();

    // cy.contains('button', 'Add Custom Field').click({force: true});
    //   cy.get('#fieldName').type('Checkbox');
    //   cy.get('#fieldType').click({ force: true });
    //   cy.get('.ant-select-item-option-content').contains('Checkbox').click();
    // //  cy.get('#isActive').click();
    //   cy.contains('button', 'Add Field').click();
    //   cy.window().then((win) => {
    //     const x = win.innerWidth - 10;
    //     const y = win.innerHeight / 2;
    //     cy.get('body').click(x, y);
    //   });

    //   cy.contains('button', 'Add Custom Field').click({force: true});
    //   cy.get('#fieldName').type('Select');
    //   cy.get('#fieldType').click({ force: true });
    //   cy.get('.ant-select-item-option-content').contains('Select').click();
    //  // cy.get('#isActive').click();
    //   cy.contains('button', 'Add Option').click();
    //   cy.get('input[placeholder="Option 1"]')
    //   .type('option 1', { force: true });
    //   cy.contains('button', 'Add Option').click();
    //   cy.get('input[placeholder="Option 2"]')
    //   .type('option 2', { force: true });

    // const selectFieldId17 = 'dependencies_additionalInformation_Select';
    // cy.get(`#${selectFieldId17}`).should('exist');
    // cy.get('#${selectFieldId17}').click();
    // cy.get('.ant-select-item-option-content').contains('option 2').click({force:true});

    //   cy.contains('button', 'Add Field').click();
    //   cy.window().then((win) => {
    //     const x = win.innerWidth - 10;
    //     const y = win.innerHeight / 2;
    //     cy.get('body').click(x, y);
    //   });

    const fileName = 'per.jpg';
    cy.get('#dependencies_profileImage', { timeout: 10000 })
      .should('not.be.visible')
      .attachFile(fileName, { force: true });
    cy.contains('button', 'Submit').click({ force: true });
  });

  it('11.cancel button should work', () => {
    cy.get('#createUserButton').click();
    cy.contains('button', 'Cancel').click();
  });

  it('12.it should back to first page ', () => {
    cy.get('#createUserButton').click();
    cy.contains('button', 'Save and Continue').click({ force: true });
    cy.get('#cancelSidebarButtonId').click({ force: true });
  });

  it('13.it should back to second page ', () => {
    cy.get('#createUserButton').click();
    cy.contains('button', 'Save and Continue').click();
    cy.get('#sidebarActionSubmitAndContinue1').click({ force: true });
    cy.get('#cancelSidebarButtonId').click({ force: true });
  });

  it('should display validation errors for required fields', () => {
    cy.get('#createUserButton').click();
    cy.contains('button', 'Save and Continue').click({ force: true });
    cy.get('#sidebarActionSubmitAndContinue1').click({ force: true });
    cy.contains('button', 'Submit').click({ force: true });
    cy.get('#dependencies_documentName_help').should(
      'contain.text',
      'Please choose the document type',
    );
    //  cy.get('[id="dependencies_additionalInformation_Bank Name_help"]').should('contain.text', 'Bank Name is required');
    //  cy.get('[id="dependencies_additionalInformation_Bank Branch_help"]').should('contain.text', 'Bank Branch is required');
    cy.get('#cancelSidebarButtonId').click({ force: true });
    cy.get('[id="dependencies_joinedDate_help"]').should(
      'contain.text',
      'Please select the joined date',
    );

    cy.get('[id="dependencies_jobTitle_help"]').should(
      'contain.text',
      'job title is required.',
    );

    cy.get('[id="dependencies_departmentId_help"]').should(
      'contain.text',
      'Please select a department',
    );

    cy.get('[id="dependencies_roleId_help"]').should(
      'contain.text',
      'Please select a role!',
    );

    cy.get('[id="dependencies_setOfPermission_help"]').should(
      'contain.text',
      'Please select at least one permission!',
    );

    cy.get('[id="dependencies_workScheduleId_help"]').should(
      'contain.text',
      'Please select a work schedule!',
    );
    cy.get('#cancelSidebarButtonId').click({ force: true });

    cy.get('[id="dependencies_profileImage_help"]').should(
      'contain.text',
      'Please upload your profile image!',
    );

    cy.get('[id="dependencies_userFirstName_help"]').should(
      'contain.text',
      'name is required.',
    );

    cy.get('[id="dependencies_userMiddleName_help"]').should(
      'contain.text',
      'Middle Name is required.',
    );

    cy.get('[id="dependencies_userLastName_help"]').should(
      'contain.text',
      'Last Name is required.',
    );

    cy.get('[ id="dependencies_userEmail_help"]').should(
      'contain.text',
      'Email is required.',
    );

    cy.get('[ id="dependencies_employeeGender_help"]').should(
      'contain.text',
      'Please enter Gender',
    );

    cy.get('[id="dependencies_dateOfBirth_help"]').should(
      'contain.text',
      'Please enter Date of Birth',
    );

    cy.get('[id="dependencies_nationalityId_help"]').should(
      'contain.text',
      'Please enter Nationality',
    );

    cy.get('[id="dependencies_maritalStatus_help"]').should(
      'contain.text',
      'Please select a marital status!',
    );

    cy.get('[id="dependencies_address_addressCountry_help"]').should(
      'contain.text',
      'country is required.',
    );

    cy.get('[id="dependencies_address_addressCity_help"]').should(
      'contain.text',
      'city is required.',
    );
    //  cy.get('[id="dependencies_address_Bank Name_help"]').should('contain.text', 'Bank Name is required.');
    //  cy.get('[id="dependencies_address_Bank Branch_help"]').should('contain.text', 'Bank Branch is required.');
    //  cy.get('[ id="dependencies_address_Account Type_help"]').should('contain.text', 'Account Type is required');

    cy.get(
      '[id="dependencies_emergencyContact_emergencyContactFullName_help"]',
    ).should('contain.text', 'Full Name is required.');

    cy.get(
      '[id="dependencies_emergencyContact_emergencyContactLastName_help"]',
    ).should('contain.text', 'Last Name is required.');

    cy.get(
      '[id="dependencies_emergencyContact_emergencyContactEmailAddress_help"]',
    ).should('contain.text', 'Email is required.');

    cy.get(
      '[ id="dependencies_emergencyContact_emergencyContactGender_help"]',
    ).should('contain.text', 'Please enter Gender');

    cy.get(
      '[id="dependencies_emergencyContact_emergencyContactDateOfBirth_help"]',
    ).should('contain.text', 'Please enter Date of Birth');

    cy.get(
      '[id="dependencies_emergencyContact_emergencyContactNationality_help"]',
    ).should('contain.text', 'Please enter Nationality');

    cy.get('[id="dependencies_bankInformation_bankName_help"]').should(
      'contain.text',
      'Bank Name is required.',
    );

    cy.get('[ id="dependencies_bankInformation_branch_help"]').should(
      'contain.text',
      'Branch is required.',
    );

    cy.get('[id="dependencies_bankInformation_accountName_help"]').should(
      'contain.text',
      'Account Name is required.',
    );

    cy.get('[id="dependencies_bankInformation_accountNumber_help"]').should(
      'contain.text',
      'Please enter Account Number',
    );
  });
});
