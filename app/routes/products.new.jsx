
import { useState } from "react";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  
  try {
    const title = formData.get("title");
    const description = formData.get("description");
    const handle = formData.get("handle");
    const productType = formData.get("productType");
    const vendor = formData.get("vendor");
    const tags = formData.get("tags")?.split(",").map(tag => tag.trim()).filter(tag => tag) || [];
    const status = formData.get("status") || "DRAFT";
    const price = formData.get("price") || "0.00";
    const inventory = parseInt(formData.get("inventory")) || 0;
    const sku = formData.get("sku") || "";

    // Validate required fields
    if (!title || title.trim() === "") {
      return json({ 
        errors: [{ field: "title", message: "Title is required" }],
        formData: Object.fromEntries(formData)
      });
    }

    // Build the product input according to Shopify API
    const productInput = {
      title,
      descriptionHtml: description || "",
      status,
      productType: productType || "",
      vendor: vendor || "",
      tags,
      variants: [{
        price,
        inventoryQuantity: inventory,
        sku: sku || "",
        inventoryManagement: "SHOPIFY"
      }]
    };

    if (handle && handle.trim() !== "") {
      productInput.handle = handle;
    }

    // Create product using GraphQL mutation
    const mutation = `
      mutation productCreate($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            title
            handle
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await admin.graphql(mutation, {
      variables: {
        input: productInput
      }
    });

    const responseJson = await response.json();
    
    if (responseJson.data.productCreate.userErrors.length > 0) {
      return json({
        errors: responseJson.data.productCreate.userErrors,
        formData: Object.fromEntries(formData)
      });
    }

    // Redirect to products list on success
    return redirect("/products");

  } catch (error) {
    console.error("Error creating product:", error);
    const formDataEntries = Object.fromEntries(formData);
    
    return json({ 
      errors: [{ 
        field: "general", 
        message: `Failed to create product: ${error.message || 'Unknown error'}. Please check the console for details.` 
      }],
      formData: formDataEntries
    });
  }
};

export default function NewProduct() {
  const navigate = useNavigate();
  const actionData = useActionData();
  const errors = actionData?.errors || [];
  
  const [formData, setFormData] = useState({
    title: actionData?.formData?.title || "",
    description: actionData?.formData?.description || "",
    handle: actionData?.formData?.handle || "",
    productType: actionData?.formData?.productType || "",
    vendor: actionData?.formData?.vendor || "",
    tags: actionData?.formData?.tags || "",
    status: actionData?.formData?.status || "DRAFT",
    price: actionData?.formData?.price || "",
    inventory: actionData?.formData?.inventory || "",
    sku: actionData?.formData?.sku || ""
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => navigate("/products")}
          type="button"
          style={{
            padding: '8px 16px',
            backgroundColor: '#f6f6f7',
            border: '1px solid #c9cccf',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '16px'
          }}
        >
          ← Back to Products
        </button>
        <h1 style={{ margin: '0', fontSize: '24px', fontWeight: '600' }}>Create Product</h1>
      </div>

      {errors.length > 0 && (
        <div style={{ 
          backgroundColor: '#fcf1f1', 
          border: '1px solid #d72c0d', 
          borderRadius: '4px', 
          padding: '16px', 
          marginBottom: '20px' 
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#d72c0d' }}>Please fix the following errors:</h3>
          <ul style={{ margin: '0', paddingLeft: '20px' }}>
            {errors.map((error, index) => (
              <li key={index} style={{ color: '#d72c0d' }}>
                {error.field}: {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Form method="post">
        <div style={{ backgroundColor: 'white', border: '1px solid #e1e3e5', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>Product Information</h2>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Title *</label>
            <input
              name="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #c9cccf',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows="4"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #c9cccf',
                borderRadius: '4px',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Handle</label>
            <input
              name="handle"
              type="text"
              value={formData.handle}
              onChange={(e) => handleInputChange("handle", e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #c9cccf',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <small style={{ color: '#6d7175' }}>Used in the product URL</small>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Product Type</label>
              <input
                name="productType"
                type="text"
                value={formData.productType}
                onChange={(e) => handleInputChange("productType", e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #c9cccf',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Vendor</label>
              <input
                name="vendor"
                type="text"
                value={formData.vendor}
                onChange={(e) => handleInputChange("vendor", e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #c9cccf',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Tags</label>
            <input
              name="tags"
              type="text"
              value={formData.tags}
              onChange={(e) => handleInputChange("tags", e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #c9cccf',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <small style={{ color: '#6d7175' }}>Separate tags with commas</small>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={(e) => handleInputChange("status", e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #c9cccf',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', border: '1px solid #e1e3e5', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>Pricing & Inventory</h2>
          
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Price</label>
              <input
                name="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleInputChange("price", e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #c9cccf',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Inventory Quantity</label>
              <input
                name="inventory"
                type="number"
                value={formData.inventory}
                onChange={(e) => handleInputChange("inventory", e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #c9cccf',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>SKU</label>
            <input
              name="sku"
              type="text"
              value={formData.sku}
              onChange={(e) => handleInputChange("sku", e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #c9cccf',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        <button
          type="submit"
          style={{
            padding: '12px 24px',
            backgroundColor: '#008060',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Save Product
        </button>
      </Form>
    </div>
  );
}
