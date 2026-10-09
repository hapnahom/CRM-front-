import 'cypress-file-upload';

describe('Manage Your Employees - Inactive Users', () => {
  beforeEach(() => {
    cy.visit('http://172.16.33.1:3000/employees/manage-employees', {
      onBeforeLoad: (win) => {
        win.localStorage.setItem(
          'authentication-storage',
          JSON.stringify({
            state: {
              token:
                'eyJhbGciOiJSUzI1NiIsImtpZCI6ImQ0MjY5YTE3MzBlNTA3MTllNmIxNjA2ZTQyYzNhYjMyYjEyODA0NDkiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiYWhtZWQgb3VtZXIiLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jS2ZYd1N1dFNGSDZUYXdfREtES2poenU3eHMwX3V1NXowZmlsdFI4ZlA1a0ZRelpicGw9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vcGVwLWF1dGhlbnRpY2F0aW9uIiwiYXVkIjoicGVwLWF1dGhlbnRpY2F0aW9uIiwiYXV0aF90aW1lIjoxNzIzNzI0NzM1LCJ1c2VyX2lkIjoiTzNDeGlyWG5iRlBHbDFxOVJHZWJGZEpsT25mMiIsInN1YiI6Ik8zQ3hpclhuYkZQR2wxcTlSR2ViRmRKbE9uZjIiLCJpYXQiOjE3MjM3MjQ3MzUsImV4cCI6MTcyMzcyODMzNSwiZW1haWwiOiJhaG1lZGlub3VtZXIxM0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJnb29nbGUuY29tIjpbIjExMTQzNzE4NjExNzY4NzU5MzAzMiJdLCJlbWFpbCI6WyJhaG1lZGlub3VtZXIxM0BnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.AApMrfhV9hkwHiLmJpXuCnQIbQNyLLgiKRhaWnWik4Br7vBu41uDB00TVY2pczclMpR7D35j2W8A5Ut3GGLFwo3yFRp9fv_eqpXXl9Rdfcp7Sv8EJ1I-O6gN4Toa9KtPHBWb_OE4GPcrPYg37DmYVUFcCLqFZ3ljP6yas20VJ65WoGM5Lmg3WenczBEnAK8H3HIlnA0CCTwG40HjKf19YljYeo-o2iyiMGUi4YdmxDG2AZMrGJu7CNNRmFjPRMnGMbnugmlfpZ_shwO0pVlGPoSLdannLsOzVs8u2ifuHi2y1SYqB0Ip0mtnB3vMP-FxJhHTCwI5qV8TZ7gEz4nwtQ',
              tenantId: '9fdb9540-607e-4cc5-aebf-0879400d1f69',
              localId: '',
            },
            version: 0,
          }),
        );
      },
    });
  });

  it('should click on the edit button and navigate to the edit page', () => {
    cy.wait(5000);
    cy.get('#editUserButton2690e9b0-c6a0-406c-9499-7848e1e9618a').click();
    cy.url().should(
      'include',
      '/employees/manage-employees/2690e9b0-c6a0-406c-9499-7848e1e9618a',
    );
  });

  it('should edit Personal Info', () => {
    cy.get('#inputEmployeeNames').type('Maris');
    cy.wait(1000); // Wait for the search to complete
    cy.get('table tbody tr').should('have.length', 2); // Adjust based on expected results
    cy.get('table tbody tr').contains('Maris').should('be.visible');
    cy.get('#editUserButtondd08c45e-2389-4008-9e67-29740fc23d32').click();
    cy.wait(5000);
    cy.url().should(
      'include',
      '/employees/manage-employees/dd08c45e-2389-4008-9e67-29740fc23d32',
    );
    cy.get('div.ant-card-extra').eq(0).find('svg').click();
    cy.get('#gender').click({ force: true });
    cy.get('div.ant-select-item-option-content').contains('Female').click();
    cy.get('#dateOfBirth').clear().type('1990-01-01');
    cy.get('body').click({ force: true });
    cy.get('#nationalityId').click({ force: true });
    cy.get('div.ant-select-item-option-content').contains('Ethiopia').click();
    cy.get('#joinedDate').clear().type('2021-01-01');
    cy.get('body').click({ force: true });
    cy.get('#maritalStatus').click({ force: true });
    cy.get('div.ant-select-item-option-content').contains('Single').click();
    cy.get('button').contains('Save Changes').eq(0).click();
  });

  it('should edit Emergency Contact information', () => {
    cy.get('#inputEmployeeNames').type('Maris');
    cy.wait(1000); // Wait for the search to complete
    cy.get('table tbody tr').should('have.length', 2); // Adjust based on expected results
    cy.get('table tbody tr').contains('Maris').should('be.visible');
    cy.get('#editUserButtondd08c45e-2389-4008-9e67-29740fc23d32').click();
    cy.wait(5000);
    cy.url().should(
      'include',
      '/employees/manage-employees/dd08c45e-2389-4008-9e67-29740fc23d32',
    );
    cy.get('div.ant-card-extra').eq(1).find('svg').click();
    cy.get('#fullName').clear().type('Abebe');
    cy.get('#lastName').clear().type('Kebede');
    cy.get('#emailAddress').clear().type('abebe@gmail.com');
    cy.get('#gender').clear().type('Female');
    cy.get('#dateOfBirth').clear().type('1990-01-01');
    cy.get('#nationality').clear().type('Ethiopia');
    cy.get('button').contains('Save Changes').click();
  });

  it('should edit Employee Address', () => {
    cy.get('#inputEmployeeNames').type('Maris');
    cy.wait(1000); // Wait for the search to complete
    cy.get('table tbody tr').should('have.length', 2); // Adjust based on expected results
    cy.get('table tbody tr').contains('Maris').should('be.visible');
    cy.get('#editUserButtondd08c45e-2389-4008-9e67-29740fc23d32').click();
    cy.wait(5000);
    cy.url().should(
      'include',
      '/employees/manage-employees/dd08c45e-2389-4008-9e67-29740fc23d32',
    );
    cy.get('div.ant-card-extra').eq(2).find('svg').click();
    cy.get('#country').clear().type('Ethiopia');
    cy.get('#city').clear().type('Addis Ababa');
    cy.get('#subcity').clear().type('Bole');
    cy.get('#woreda').clear().type('13');
    cy.get('#primaryAddress').clear().type('Bole');
    cy.get('button').contains('Save Changes').click();
  });

  it('should edit Employee Bank Information', () => {
    cy.get('#inputEmployeeNames').type('Maris');
    cy.wait(1000); // Wait for the search to complete
    cy.get('table tbody tr').should('have.length', 2); // Adjust based on expected results
    cy.get('table tbody tr').contains('Maris').should('be.visible');
    cy.get('#editUserButtondd08c45e-2389-4008-9e67-29740fc23d32').click();
    cy.wait(5000);
    cy.url().should(
      'include',
      '/employees/manage-employees/dd08c45e-2389-4008-9e67-29740fc23d32',
    );
    cy.get('div.ant-card-extra').eq(3).find('svg').click();
    cy.get('#bankName').clear().type('CBE');
    cy.get('#branch').clear().type('Bole');
    cy.get('#accountName').clear().type('Abebe Kebede');
    cy.get('#accountNumber').clear().type('1000000000000');
    cy.get('button').contains('Save Changes').click();
  });

  it('should edit Employee Job Information', () => {
    cy.get('#inputEmployeeNames').type('Maris');
    cy.wait(1000); // Wait for the search to complete
    cy.get('table tbody tr').should('have.length', 2); // Adjust based on expected results
    cy.get('table tbody tr').contains('Maris').should('be.visible');
    cy.get('#editUserButtondd08c45e-2389-4008-9e67-29740fc23d32').click();
    cy.wait(5000);
    cy.url().should(
      'include',
      '/employees/manage-employees/dd08c45e-2389-4008-9e67-29740fc23d32',
    );
    cy.get('#rc-tabs-1-tab-2').click();
  });

  it('should upload Employee Documents', () => {
    cy.get('#inputEmployeeNames').type('Maris');
    cy.wait(1000); // Wait for the search to complete
    cy.get('table tbody tr').should('have.length', 2); // Adjust based on expected results
    cy.get('table tbody tr').contains('Maris').should('be.visible');
    cy.get('#editUserButtondd08c45e-2389-4008-9e67-29740fc23d32').click();
    cy.wait(5000);
    cy.url().should(
      'include',
      '/employees/manage-employees/dd08c45e-2389-4008-9e67-29740fc23d32',
    );
    cy.get('#rc-tabs-1-tab-3').click();
    cy.get('button').contains('Upload File').click();

    // Selector for the file input element
    const fileInputSelector = 'input[type="file"]';

    // Path to the file in fixtures directory
    const filePath = 'example.json';

    // Upload the file
    cy.get(fileInputSelector).attachFile(filePath);
    cy.get('#sidebarActionCreateSubmit').click();
  });

  it('should edit Role Permission of Employee', () => {
    cy.get('#inputEmployeeNames').type('Maris');
    cy.wait(1000); // Wait for the search to complete
    cy.get('table tbody tr').should('have.length', 2); // Adjust based on expected results
    cy.get('table tbody tr').contains('Maris').should('be.visible');
    cy.get('#editUserButtondd08c45e-2389-4008-9e67-29740fc23d32').click();
    cy.wait(5000);
    cy.url().should(
      'include',
      '/employees/manage-employees/dd08c45e-2389-4008-9e67-29740fc23d32',
    );
    cy.get('#rc-tabs-1-tab-4').click();
    cy.get('div.ant-card-extra svg.cursor-pointer').eq(4).click();
    cy.get('#dependencies_roleId').click({ force: true });
    cy.get('div.ant-select-item-option-content').contains('owner').click();
    cy.get('button').contains('Save changes').click();
  });
});
