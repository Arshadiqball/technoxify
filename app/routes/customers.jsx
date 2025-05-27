import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Text,
  useIndexResourceState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const customerResponse = await admin.graphql(`
    {
      customers(first: 10) {
        edges {
          node {
            id
            displayName
            email
            phone
            createdAt
          }
        }
      }
    }
  `);
  const json = await customerResponse.json();

  const customers = json.data.customers.edges.map((edge) => edge.node);
  return { customers };
};

export default function Customers() {
  const { customers } = useLoaderData();

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(customers);

  const rowMarkup = customers.map((customer, index) => (
    <IndexTable.Row
      id={customer.id}
      key={customer.id}
      selected={selectedResources.includes(customer.id)}
      position={index}
    >
      <IndexTable.Cell>{customer.displayName}</IndexTable.Cell>
      <IndexTable.Cell>{customer.email}</IndexTable.Cell>
      <IndexTable.Cell>{customer.phone || "—"}</IndexTable.Cell>
      <IndexTable.Cell>
        {new Date(customer.createdAt).toLocaleDateString()}
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page title="Customers">
      <Layout>
        <Layout.Section>
          <Card>
            <IndexTable
              resourceName={{ singular: "customer", plural: "customers" }}
              itemCount={customers.length}
              selectedItemsCount={
                allResourcesSelected ? "All" : selectedResources.length
              }
              onSelectionChange={handleSelectionChange}
              headings={[
                { title: "Name" },
                { title: "Email" },
                { title: "Phone" },
                { title: "Created At" },
              ]}
            >
              {rowMarkup}
            </IndexTable>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
