describe('Clusters Page Topology (Real Data)', () => {
    before(() => {
        // 1. Clean Database
        cy.exec('node reset_db.js', { failOnNonZeroExit: false }).then((result) => {
            cy.log('DB Reset Output:', result.stdout);
        });

        // 2. Run K6 Load Test (Deterministic)
        // Path to K6 script
        const k6ScriptPath = '../codigo/ms-tra-transaction-integrator-cobranza/tests/k6/cypress_test.js';

        // Run K6 with 50 iterations
        // We enforce failOnNonZeroExit: true to ensure the backend is actually running and reachable
        cy.exec(`k6 run ${k6ScriptPath}`, { failOnNonZeroExit: true, timeout: 60000 }).then((result) => {
            cy.log('K6 Output:', result.stdout);
        });
    });

    beforeEach(() => {
        // 3. Navigation Flow
        cy.visit('/');

        // Handle Integrator Selection
        cy.contains('Selecciona un Integrador').should('be.visible');
        cy.get('[data-testid="integrator-card"]').first().should('be.visible').click();

        // Wait for Dashboard then navigate to Clusters
        cy.url().should('include', '/dashboard');
        cy.get('a[href="/clusters"]').click();
        cy.url().should('include', '/clusters');

        // Wait for data to load (CORE INTEGRATOR is the main node)
        // Increased timeout to 30s to match backend window
        cy.contains('CORE INTEGRATOR', { timeout: 30000 }).should('be.visible');
    });

    it('should render the topology layout with real data', () => {
        // Verify Source Clusters (Real names might vary, checking for generic presence)
        cy.get('.grid-cols-1 > div').should('have.length.at.least', 1);

        // Verify Integrator Node
        cy.contains('CORE INTEGRATOR').should('be.visible');

        // Verify Destination Cluster
        cy.contains('Destination Cluster').should('be.visible');
    });

    it('should display topic details', () => {
        // We expect topics to be present after K6 run
        cy.contains('Tópicos Configurados').should('be.visible');
        // Check that we have some topic names listed
        cy.get('.custom-scrollbar div').should('have.length.gt', 0);
    });

    it('should render topology connection lines', () => {
        // Check for SVG existence
        cy.get('svg').should('exist');
        // Check for connection paths
        cy.get('path').should('have.length.at.least', 2);
    });

    it('should show correct processed and integrated counts', () => {
        // Since K6 ran in `before()`, we expect:
        // Processed: (47 successes * 3 messages) + (3 errors * 1 message) = 141 + 3 = 144
        // Integrated: 47 successes * 1 message = 47

        // Use .should() callback to retry until the data syncs (wait up to 30s)
        cy.contains('Procesando Transacciones').parent().parent().within(() => {
            cy.get('p.text-xl').first().should(($p) => {
                const text = $p.text();
                const count = parseInt(text.replace(/,/g, '') || '0');
                expect(count).to.equal(144);
            });
        });

        cy.contains('Integrados').parent().within(() => {
            cy.get('p.text-xl').should(($p) => {
                const text = $p.text();
                const count = parseInt(text.replace(/,/g, '') || '0');
                expect(count).to.equal(47);
            });
        });
    });
});
