
import { useState, useCallback } from "react";
import { useLoaderData, useNavigate, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  Select,
  Text,
  BlockStack,
  InlineStack,
  Divider,
  Badge,
  AppProvider,
  ResourceList,
  ResourceItem,
  Thumbnail,
  ButtonGroup,
  Checkbox,
  Modal,
  EmptyState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { redirect } from "@remix-run/node";
import polarisTranslations from "@shopify/polaris/locales/en.json";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Fetch products for selection
  const productsResponse = await admin.graphql(`
    query getProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
            status
            totalInventory
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  price
                  inventoryQuantity
                  sku
                  image {
                    url
                    altText
                  }
                }
              }
            }
            featuredImage {
              url
              altText
            }
          }
        }
      }
    }
  `, {
    variables: { first: 50 }
  });

  // Fetch customers for selection
  const customersResponse = await admin.graphql(`
    query getCustomers($first: Int!) {
      customers(first: $first) {
        edges {
          node {
            id
            displayName
            firstName
            lastName
            email
            phone
          }
        }
      }
    }
  `, {
    variables: { first: 50 }
  });

  const productsJson = await productsResponse.json();
  const customersJson = await customersResponse.json();

  return {
    products: productsJson.data.products.edges,
    customers: customersJson.data.customers.edges,
    polarisTranslations
  };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const lineItems = JSON.parse(formData.get("lineItems"));
  const customerId = formData.get("customerId");
  const tags = formData.get("tags");
  const notes = formData.get("notes");

  try {
    const orderCreateResponse = await admin.graphql(`
      mutation draftOrderCreate($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder {
            id
            name
            order {
              id
              name
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `, {
      variables: {
        input: {
          lineItems: lineItems.map(item => ({
            variantId: item.variantId,
            quantity: parseInt(item.quantity)
          })),
          customerId: customerId || null,
          tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
          note: notes || null,
          useCustomerDefaultAddress: true
        }
      }
    });

    const result = await orderCreateResponse.json();
    
    if (result.data.draftOrderCreate.userErrors.length === 0) {
      // Complete the draft order to create actual order
      const draftOrderId = result.data.draftOrderCreate.draftOrder.id;
      
      const completeResponse = await admin.graphql(`
        mutation draftOrderComplete($id: ID!) {
          draftOrderComplete(id: $id) {
            draftOrder {
              id
              order {
                id
                name
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `, {
        variables: { id: draftOrderId }
      });

      const completeResult = await completeResponse.json();
      
      if (completeResult.data.draftOrderComplete.userErrors.length === 0) {
        return redirect("/orders");
      } else {
        return { 
          success: false, 
          errors: completeResult.data.draftOrderComplete.userErrors 
        };
      }
    }
    
    return { 
      success: false, 
      errors: result.data.draftOrderCreate.userErrors 
    };
  } catch (error) {
    console.error("Order creation error:", error);
    return { 
      success: false, 
      errors: [{ message: "Failed to create order. Please try again." }] 
    };
  }
};

export default function CreateOrder() {
  const { products, customers, polarisTranslations } = useLoaderData();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const isLoading = fetcher.state === "submitting";

  // Filter products based on search
  const filteredProducts = products.filter(({ node: product }) =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter customers based on search
  const filteredCustomers = customers.filter(({ node: customer }) =>
    customer.displayName.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(customerSearchQuery.toLowerCase())
  );

  const handleAddProduct = useCallback((product, variant) => {
    const existingIndex = selectedProducts.findIndex(
      item => item.variantId === variant.id
    );

    if (existingIndex >= 0) {
      const updated = [...selectedProducts];
      updated[existingIndex].quantity += 1;
      setSelectedProducts(updated);
    } else {
      setSelectedProducts(prev => [...prev, {
        productId: product.id,
        variantId: variant.id,
        productTitle: product.title,
        variantTitle: variant.title,
        price: parseFloat(variant.price),
        quantity: 1,
        image: variant.image || product.featuredImage
      }]);
    }
    setShowProductModal(false);
  }, [selectedProducts]);

  const handleQuantityChange = useCallback((variantId, quantity) => {
    const updated = selectedProducts.map(item =>
      item.variantId === variantId 
        ? { ...item, quantity: Math.max(1, parseInt(quantity) || 1) }
        : item
    );
    setSelectedProducts(updated);
  }, [selectedProducts]);

  const handleRemoveProduct = useCallback((variantId) => {
    setSelectedProducts(prev => prev.filter(item => item.variantId !== variantId));
  }, []);

  const handleCustomerSelect = useCallback((customerId) => {
    setSelectedCustomer(customerId);
    setShowCustomerModal(false);
  }, []);

  const calculateSubtotal = () => {
    return selectedProducts.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.18; // 18% GST
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleSubmit = useCallback(() => {
    if (selectedProducts.length === 0) {
      return;
    }

    const formData = new FormData();
    formData.append("lineItems", JSON.stringify(selectedProducts));
    formData.append("customerId", selectedCustomer);
    formData.append("tags", tags);
    formData.append("notes", notes);

    fetcher.submit(formData, { method: "post" });
  }, [selectedProducts, selectedCustomer, tags, notes, fetcher]);

  const selectedCustomerData = selectedCustomer 
    ? customers.find(({ node }) => node.id === selectedCustomer)?.node
    : null;

  return (
    <AppProvider i18n={polarisTranslations}>
      <Page
        title="Create order"
        backAction={{ url: "/orders" }}
        primaryAction={{
          content: "Save",
          loading: isLoading,
          disabled: selectedProducts.length === 0,
          onAction: handleSubmit
        }}
        secondaryActions={[
          {
            content: "Discard",
            onAction: () => navigate("/orders")
          }
        ]}
      >
        <Layout>
          <Layout.Section variant="twoThirds">
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Products</Text>
                
                <Button onClick={() => setShowProductModal(true)}>
                  {selectedProducts.length === 0 ? "Browse" : "Add products"}
                </Button>

                {selectedProducts.length > 0 && (
                  <div>
                    {selectedProducts.map((item) => (
                      <div key={item.variantId} style={{ 
                        border: '1px solid #e1e3e5', 
                        borderRadius: '8px', 
                        padding: '16px', 
                        marginBottom: '12px' 
                      }}>
                        <InlineStack align="space-between">
                          <InlineStack gap="300">
                            {item.image && (
                              <Thumbnail
                                source={item.image.url}
                                alt={item.image.altText || item.productTitle}
                                size="small"
                              />
                            )}
                            <BlockStack gap="100">
                              <Text variant="bodyMd" fontWeight="semibold">
                                {item.productTitle}
                              </Text>
                              {item.variantTitle !== 'Default Title' && (
                                <Text variant="bodySm" color="subdued">
                                  {item.variantTitle}
                                </Text>
                              )}
                              <Text variant="bodySm">
                                Rs {item.price.toFixed(2)}
                              </Text>
                            </BlockStack>
                          </InlineStack>
                          
                          <InlineStack gap="200">
                            <TextField
                              type="number"
                              value={item.quantity.toString()}
                              onChange={(value) => handleQuantityChange(item.variantId, value)}
                              min="1"
                              style={{ width: '80px' }}
                            />
                            <Text variant="bodyMd">
                              Rs {(item.price * item.quantity).toFixed(2)}
                            </Text>
                            <Button 
                              variant="plain" 
                              onClick={() => handleRemoveProduct(item.variantId)}
                            >
                              Remove
                            </Button>
                          </InlineStack>
                        </InlineStack>
                      </div>
                    ))}
                  </div>
                )}

                <Divider />

                <Text variant="headingMd" as="h2">Payment</Text>
                
                <InlineStack align="space-between">
                  <Text variant="bodyMd">Subtotal</Text>
                  <Text variant="bodyMd">Rs {calculateSubtotal().toFixed(2)}</Text>
                </InlineStack>

                <InlineStack align="space-between">
                  <Text variant="bodyMd">Add discount</Text>
                  <Text variant="bodyMd">Rs 0.00</Text>
                </InlineStack>

                <InlineStack align="space-between">
                  <Text variant="bodyMd">Add shipping or delivery</Text>
                  <Text variant="bodyMd">Rs 0.00</Text>
                </InlineStack>

                <InlineStack align="space-between">
                  <Text variant="bodyMd">GST 18%</Text>
                  <Text variant="bodyMd">Rs {calculateTax().toFixed(2)}</Text>
                </InlineStack>

                <Divider />

                <InlineStack align="space-between">
                  <Text variant="bodyMd" fontWeight="semibold">Total</Text>
                  <Text variant="bodyMd" fontWeight="semibold">
                    Rs {calculateTotal().toFixed(2)}
                  </Text>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h2">Notes</Text>
                  <TextField
                    value={notes}
                    onChange={setNotes}
                    multiline={4}
                    placeholder="No notes"
                  />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h2">Customer</Text>
                  {selectedCustomerData ? (
                    <InlineStack align="space-between">
                      <BlockStack gap="100">
                        <Text variant="bodyMd" fontWeight="semibold">
                          {selectedCustomerData.displayName}
                        </Text>
                        <Text variant="bodySm" color="subdued">
                          {selectedCustomerData.email}
                        </Text>
                      </BlockStack>
                      <Button 
                        variant="plain" 
                        onClick={() => setSelectedCustomer("")}
                      >
                        Remove
                      </Button>
                    </InlineStack>
                  ) : (
                    <Button onClick={() => setShowCustomerModal(true)}>
                      Search or create a customer
                    </Button>
                  )}
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h2">Tags</Text>
                  <TextField
                    value={tags}
                    onChange={setTags}
                    placeholder="Enter tags separated by commas"
                  />
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>

        {/* Product Selection Modal */}
        <Modal
          open={showProductModal}
          onClose={() => setShowProductModal(false)}
          title="Add products"
          large
        >
          <Modal.Section>
            <BlockStack gap="400">
              <TextField
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search products"
                clearButton
                onClearButtonClick={() => setSearchQuery("")}
              />
              
              {filteredProducts.length === 0 ? (
                <EmptyState
                  heading="No products found"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Try adjusting your search terms.</p>
                </EmptyState>
              ) : (
                <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                  {filteredProducts.map(({ node: product }) => (
                    <div key={product.id}>
                      {product.variants.edges.map(({ node: variant }) => (
                        <div 
                          key={variant.id}
                          style={{ 
                            border: '1px solid #e1e3e5',
                            borderRadius: '8px',
                            padding: '16px',
                            marginBottom: '12px',
                            cursor: 'pointer'
                          }}
                          onClick={() => handleAddProduct(product, variant)}
                        >
                          <InlineStack gap="300">
                            {(variant.image || product.featuredImage) && (
                              <Thumbnail
                                source={(variant.image || product.featuredImage).url}
                                alt={(variant.image || product.featuredImage).altText || product.title}
                                size="small"
                              />
                            )}
                            <BlockStack gap="100">
                              <Text variant="bodyMd" fontWeight="semibold">
                                {product.title}
                              </Text>
                              {variant.title !== 'Default Title' && (
                                <Text variant="bodySm" color="subdued">
                                  {variant.title}
                                </Text>
                              )}
                              <Text variant="bodySm">
                                Rs {parseFloat(variant.price).toFixed(2)}
                              </Text>
                              {variant.sku && (
                                <Text variant="bodySm" color="subdued">
                                  SKU: {variant.sku}
                                </Text>
                              )}
                            </BlockStack>
                          </InlineStack>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </BlockStack>
          </Modal.Section>
        </Modal>

        {/* Customer Selection Modal */}
        <Modal
          open={showCustomerModal}
          onClose={() => setShowCustomerModal(false)}
          title="Select customer"
          large
        >
          <Modal.Section>
            <BlockStack gap="400">
              <TextField
                value={customerSearchQuery}
                onChange={setCustomerSearchQuery}
                placeholder="Search customers"
                clearButton
                onClearButtonClick={() => setCustomerSearchQuery("")}
              />
              
              {filteredCustomers.length === 0 ? (
                <EmptyState
                  heading="No customers found"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Try adjusting your search terms.</p>
                </EmptyState>
              ) : (
                <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                  {filteredCustomers.map(({ node: customer }) => (
                    <div 
                      key={customer.id}
                      style={{ 
                        border: '1px solid #e1e3e5',
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '12px',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleCustomerSelect(customer.id)}
                    >
                      <BlockStack gap="100">
                        <Text variant="bodyMd" fontWeight="semibold">
                          {customer.displayName}
                        </Text>
                        <Text variant="bodySm" color="subdued">
                          {customer.email}
                        </Text>
                        {customer.phone && (
                          <Text variant="bodySm" color="subdued">
                            {customer.phone}
                          </Text>
                        )}
                      </BlockStack>
                    </div>
                  ))}
                </div>
              )}
            </BlockStack>
          </Modal.Section>
        </Modal>
      </Page>
    </AppProvider>
  );
}
