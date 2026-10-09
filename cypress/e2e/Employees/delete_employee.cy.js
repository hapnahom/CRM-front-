describe('Manage Your Employees - Inactive Users', () => {
  beforeEach(() => {
    cy.visit('http://172.16.35.48:3000/employees/manage-employees', {
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

  it('should load the employee management page with required elements', () => {
    cy.get('.self-stretch').contains('Employees').should('be.visible');
    cy.get('#inputEmployeeNames').should('be.visible');
    cy.get('button').contains('Create user').should('be.visible');
  });

  it('should filter employees based on search input', () => {
    cy.get('#inputEmployeeNames').type('Maris');
    cy.wait(1000); // Wait for the search to complete
    cy.get('table tbody tr').should('have.length', 2); // Adjust based on expected results
    cy.get('table tbody tr').contains('Maris').should('be.visible');
  });

  it('should delete an employee and remove from the table', () => {
    cy.get('#deleteUserButtonc7fde723-eb63-4752-a7e2-be60f2ff5d3a').click();
    cy.get('#confirmDeleteId').click();
    cy.get('#deleteUserButtonc7fde723-eb63-4752-a7e2-be60f2ff5d3a').click();
  });
  it('should delete an employee after searching', () => {
    // Search for the employee
    cy.get('#inputEmployeeNames').type('John');

    // Click the delete button
    cy.get('#deleteUserButton56c937b7-91b2-4f2d-91cc-3fd70433b7ef').click();

    // Confirm the deletion
    cy.get('#confirmDeleteId').click();

    // Assert that the employee is no longer visible
    cy.get('table').should('not.contain', 'John'); // Adjust the selector as needed
  });
});
