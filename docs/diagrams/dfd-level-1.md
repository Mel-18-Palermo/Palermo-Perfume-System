# Data flow diagram: level 1

Related issue: #146

This diagram breaks the Palermo Perfume System into its main processes. Data-store names are logical
and may change after the ERD and data dictionary are approved.

```mermaid
flowchart LR
    Customer["Customer"]
    Admin["Administrator"]
    Payment["Payment sandbox"]
    AI["AI assistant API"]

    subgraph Palermo["Palermo Perfume System"]
        P1(("1.0 Account and profile"))
        P2(("2.0 Fragrance discovery"))
        P3(("3.0 Cart and checkout"))
        P4(("4.0 Order and payment"))
        P5(("5.0 Support and AI chat"))
        P6(("6.0 Admin and reporting"))

        D1[("D1 Users and profiles")]
        D2[("D2 Product catalogue")]
        D3[("D3 Carts and orders")]
        D4[("D4 Payments and invoices")]
        D5[("D5 Support and chat logs")]
    end

    Customer -->|"registration, login, preferences"| P1
    P1 -->|"account status and profile"| Customer
    P1 <-->|"user and scent-profile data"| D1

    Customer -->|"quiz answers, search, filters"| P2
    P2 -->|"products and recommendations"| Customer
    P2 <-->|"profile preferences"| D1
    P2 <-->|"products, notes, categories"| D2

    Customer -->|"cart changes, promo code, shipping choice"| P3
    P3 -->|"cart totals and checkout summary"| Customer
    P3 <-->|"cart and draft-order data"| D3
    P3 -->|"confirmed checkout"| P4

    P4 -->|"payment request"| Payment
    Payment -->|"payment result"| P4
    P4 -->|"order confirmation and invoice"| Customer
    P4 <-->|"order status"| D3
    P4 <-->|"payment and invoice data"| D4

    Customer -->|"support question"| P5
    P5 -->|"support response"| Customer
    P5 -->|"sanitized prompt"| AI
    AI -->|"assistant response"| P5
    P5 <-->|"inquiry and chat history"| D5

    Admin -->|"catalog, stock, support, report request"| P6
    P6 -->|"update result and report"| Admin
    P6 <-->|"catalog and stock data"| D2
    P6 <-->|"order data"| D3
    P6 <-->|"payment and invoice data"| D4
    P6 <-->|"support records"| D5
```

External services receive only the data needed for their request. Payment credentials, API keys,
session identifiers, and unnecessary profile details do not cross the system boundary.
