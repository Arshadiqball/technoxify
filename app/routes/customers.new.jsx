
import { useState } from "react";
import { useNavigate } from "@remix-run/react";
import { redirect } from "@remix-run/node";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  Select,
  Checkbox,
  Text,
  BlockStack,
  InlineStack,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const customerData = {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    acceptsMarketing: formData.get("acceptsMarketing") === "on",
    note: formData.get("note"),
    tags: formData.get("tags")?.split(",").map(tag => tag.trim()) || [],
  };

  const customerCreateResponse = await admin.graphql(`
    mutation customerCreate($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer {
          id
          displayName
          email
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
    variables: {
      input: customerData
    }
  });

  const result = await customerCreateResponse.json();
  
  if (result.data.customerCreate.userErrors.length === 0) {
    return redirect("/customers");
  }
  
  return { errors: result.data.customerCreate.userErrors };
};

export default function NewCustomer() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    note: "",
    tags: "",
    acceptsMarketing: false,
  });

  const handleChange = (field) => (value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Page
      breadcrumbs={[{ content: "Customers", url: "/customers" }]}
      title="Add customer"
      primaryAction={{
        content: "Save customer",
        onAction: () => {
          // Handle form submission
          const form = document.createElement('form');
          form.method = 'POST';
          Object.entries(formData).forEach(([key, value]) => {
            const input = document.createElement('input');
            input.name = key;
            input.value = value;
            form.appendChild(input);
          });
          document.body.appendChild(form);
          form.submit();
        },
      }}
      secondaryActions={[
        {
          content: "Cancel",
          onAction: () => navigate("/customers"),
        },
      ]}
    >
      <Layout>
        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Customer information
              </Text>
              <FormLayout>
                <InlineStack gap="400">
                  <TextField
                    label="First name"
                    value={formData.firstName}
                    onChange={handleChange("firstName")}
                    autoComplete="given-name"
                  />
                  <TextField
                    label="Last name"
                    value={formData.lastName}
                    onChange={handleChange("lastName")}
                    autoComplete="family-name"
                  />
                </InlineStack>
                <TextField
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange("email")}
                  autoComplete="email"
                />
                <TextField
                  label="Phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange("phone")}
                  autoComplete="tel"
                />
              </FormLayout>
            </BlockStack>
          </Card>
        </Layout.Section>
        
        <Layout.Section variant="oneHalf">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Marketing
                </Text>
                <Checkbox
                  label="Customer agrees to receive marketing emails"
                  checked={formData.acceptsMarketing}
                  onChange={handleChange("acceptsMarketing")}
                />
              </BlockStack>
            </Card>
            
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Notes and tags
                </Text>
                <FormLayout>
                  <TextField
                    label="Notes"
                    value={formData.note}
                    onChange={handleChange("note")}
                    multiline={4}
                    helpText="Add notes about this customer"
                  />
                  <TextField
                    label="Tags"
                    value={formData.tags}
                    onChange={handleChange("tags")}
                    helpText="Separate tags with commas"
                  />
                </FormLayout>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
