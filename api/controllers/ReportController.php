<?php
declare(strict_types=1);

final class ReportController
{
    public function __construct(private PDO $conn)
    {
    }

    public function summary(): void
    {
        $revenueQuery = 'SELECT COALESCE(SUM(d.i_Quantity*p.i_Price),0) FROM tb_orderdetails d JOIN tb_products p ON p.i_ProductID=d.i_ProductID';
        $summary = [
            'products' => (int)$this->conn->query('SELECT COUNT(*) FROM tb_products')->fetchColumn(),
            'customers' => (int)$this->conn->query('SELECT COUNT(*) FROM tb_customers')->fetchColumn(),
            'orders' => (int)$this->conn->query('SELECT COUNT(*) FROM tb_orders')->fetchColumn(),
            'revenue' => (float)$this->conn->query($revenueQuery)->fetchColumn(),
        ];
        $monthly = $this->conn->query('SELECT DATE_FORMAT(STR_TO_DATE(o.c_OrderDate, "%e/%c/%Y"), "%Y-%m") AS month, ROUND(SUM(d.i_Quantity*p.i_Price),2) AS revenue FROM tb_orders o JOIN tb_orderdetails d ON d.i_OrderID=o.i_OrderID JOIN tb_products p ON p.i_ProductID=d.i_ProductID GROUP BY month ORDER BY MIN(STR_TO_DATE(o.c_OrderDate, "%e/%c/%Y"))')->fetchAll();
        $top = $this->conn->query('SELECT p.c_ProductName AS product_name, SUM(d.i_Quantity) AS quantity, ROUND(SUM(d.i_Quantity*p.i_Price),2) AS revenue FROM tb_orderdetails d JOIN tb_products p ON p.i_ProductID=d.i_ProductID GROUP BY p.i_ProductID ORDER BY revenue DESC LIMIT 5')->fetchAll();
        Response::success(['data' => ['summary' => $summary, 'monthly_sales' => $monthly, 'top_products' => $top]]);
    }
}
