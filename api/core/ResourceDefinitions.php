<?php
declare(strict_types=1);

final class ResourceDefinitions
{
    public static function get(string $name): array
    {
        $resources = [
            'products' => [
                'table' => 'tb_products', 'key' => 'product_id', 'db_key' => 'i_ProductID',
                'fields' => ['product_name' => 'string:30', 'supplier_id' => 'integer', 'category_id' => 'integer', 'quantity_per_unit' => 'string:30', 'unit_price' => 'number'],
                'columns' => ['product_name' => 'c_ProductName', 'supplier_id' => 'i_SupplierID', 'category_id' => 'i_CategoryID', 'quantity_per_unit' => 'c_Unit', 'unit_price' => 'i_Price'],
                'select' => 'SELECT p.i_ProductID AS product_id, p.c_ProductName AS product_name, p.i_SupplierID AS supplier_id, p.i_CategoryID AS category_id, p.c_Unit AS quantity_per_unit, p.i_Price AS unit_price, s.c_SupplierName AS supplier_name, c.c_CategoryName AS category_name FROM tb_products p LEFT JOIN tb_suppliers s ON s.i_SupplierID=p.i_SupplierID LEFT JOIN tb_categories c ON c.i_CategoryID=p.i_CategoryID',
                'search' => 'c_ProductName', 'search_id' => 'i_ProductID', 'auto_increment' => true,
            ],
            'categories' => [
                'table' => 'tb_categories', 'key' => 'category_id', 'db_key' => 'i_CategoryID',
                'fields' => ['category_name' => 'string:30', 'description' => 'string:30?'],
                'columns' => ['category_name' => 'c_CategoryName', 'description' => 'c_Description'],
                'select' => 'SELECT i_CategoryID AS category_id, c_CategoryName AS category_name, c_Description AS description FROM tb_categories',
                'search' => 'c_CategoryName', 'search_id' => 'i_CategoryID',
            ],
            'customers' => [
                'table' => 'tb_customers', 'key' => 'customer_id', 'db_key' => 'i_customerid',
                'fields' => ['company_name' => 'string:50', 'contact_name' => 'string:50', 'address' => 'string:500', 'city' => 'string:50', 'postal_code' => 'string:30', 'country' => 'string:50'],
                'columns' => ['company_name' => 'c_customername', 'contact_name' => 'c_contactname', 'address' => 'c_address', 'city' => 'c_city', 'postal_code' => 'c_postalcode', 'country' => 'c_country'],
                'select' => 'SELECT i_customerid AS customer_id, c_customername AS company_name, c_contactname AS contact_name, c_address AS address, c_city AS city, c_postalcode AS postal_code, c_country AS country FROM tb_customers',
                'search' => 'c_customername', 'search_id' => 'i_customerid',
            ],
            'suppliers' => [
                'table' => 'tb_suppliers', 'key' => 'supplier_id', 'db_key' => 'i_SupplierID',
                'fields' => ['company_name' => 'string:30', 'contact_name' => 'string:30', 'address' => 'string:30', 'city' => 'string:30', 'postal_code' => 'string:30', 'country' => 'string:30', 'phone' => 'string:30'],
                'columns' => ['company_name' => 'c_SupplierName', 'contact_name' => 'c_ContactName', 'address' => 'c_Address', 'city' => 'c_City', 'postal_code' => 'c_PostalCode', 'country' => 'c_Country', 'phone' => 'c_Phone'],
                'select' => 'SELECT i_SupplierID AS supplier_id, c_SupplierName AS company_name, c_ContactName AS contact_name, c_Address AS address, c_City AS city, c_PostalCode AS postal_code, c_Country AS country, c_Phone AS phone FROM tb_suppliers',
                'search' => 'c_SupplierName', 'search_id' => 'i_SupplierID',
            ],
            'employees' => [
                'table' => 'tb_employees', 'key' => 'employee_id', 'db_key' => 'i_EmployeeID',
                'fields' => ['last_name' => 'string:30', 'first_name' => 'string:30', 'notes' => 'string:80?'],
                'columns' => ['last_name' => 'c_LastName', 'first_name' => 'c_FirstName', 'notes' => 'c_Notes'],
                'select' => 'SELECT i_EmployeeID AS employee_id, c_LastName AS last_name, c_FirstName AS first_name, c_Notes AS notes FROM tb_employees',
                'search' => 'c_LastName', 'search_id' => 'i_EmployeeID',
            ],
            'shippers' => [
                'table' => 'tb_shippers', 'key' => 'shipper_id', 'db_key' => 'i_ShipperID',
                'fields' => ['company_name' => 'string:30', 'phone' => 'string:30'],
                'columns' => ['company_name' => 'c_ShipperName', 'phone' => 'c_Phone'],
                'select' => 'SELECT i_ShipperID AS shipper_id, c_ShipperName AS company_name, c_Phone AS phone FROM tb_shippers',
                'search' => 'c_ShipperName', 'search_id' => 'i_ShipperID',
            ],
        ];
        if (!isset($resources[$name])) {
            Response::notFound('Unknown resource.');
        }
        return $resources[$name];
    }
}
