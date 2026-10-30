<?php
declare(strict_types=1);

final class OrderController
{
    private const SELECT = 'SELECT o.i_OrderID AS order_id, o.i_CustomerID AS customer_id, c.c_customername AS company_name, o.i_EmployeeID AS employee_id, CONCAT(e.c_FirstName, " ", e.c_LastName) AS employee_name, o.i_ShipperID AS ship_via, s.c_ShipperName AS shipper_name, DATE_FORMAT(STR_TO_DATE(o.c_OrderDate, "%e/%c/%Y"), "%Y-%m-%d") AS order_date, COALESCE((SELECT SUM(d.i_Quantity*p.i_Price) FROM tb_orderdetails d JOIN tb_products p ON p.i_ProductID=d.i_ProductID WHERE d.i_OrderID=o.i_OrderID), 0) AS total FROM tb_orders o LEFT JOIN tb_customers c ON c.i_customerid=o.i_CustomerID LEFT JOIN tb_employees e ON e.i_EmployeeID=o.i_EmployeeID LEFT JOIN tb_shippers s ON s.i_ShipperID=o.i_ShipperID';

    public function __construct(private PDO $conn)
    {
    }

    public function index(): void
    {
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(100, max(1, (int)($_GET['limit'] ?? 20)));
        $search = trim((string)($_GET['search'] ?? ''));
        $sort = strtolower((string)($_GET['sort'] ?? 'desc')) === 'asc' ? 'ASC' : 'DESC';
        $where = $search !== '' ? ' WHERE CAST(o.i_OrderID AS CHAR) LIKE ? OR c.c_customername LIKE ?' : '';

        $count = $this->conn->prepare('SELECT COUNT(*) FROM tb_orders o LEFT JOIN tb_customers c ON c.i_customerid=o.i_CustomerID' . $where);
        $count->execute($search !== '' ? ["%$search%", "%$search%"] : []);
        $total = (int)$count->fetchColumn();
        $page = min($page, max(1, (int)ceil($total / $limit)));

        $stmt = $this->conn->prepare(self::SELECT . $where . " ORDER BY o.i_OrderID $sort LIMIT ? OFFSET ?");
        $params = $search !== '' ? ["%$search%", "%$search%"] : [];
        $params[] = $limit;
        $params[] = ($page - 1) * $limit;
        foreach ($params as $index => $value) {
            $stmt->bindValue($index + 1, $value, $index >= count($params) - 2 ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        $stmt->execute();
        Response::success(['data' => $stmt->fetchAll(), 'meta' => ['page' => $page, 'limit' => $limit, 'total' => $total]]);
    }

    public function show(string $id): void
    {
        $stmt = $this->conn->prepare(self::SELECT . ' WHERE o.i_OrderID = ?');
        $stmt->execute([(int)$id]);
        $order = $stmt->fetch();
        if (!$order) {
            Response::error('Order not found.', 404);
        }
        $items = $this->conn->prepare('SELECT d.i_ProductID AS product_id, p.c_ProductName AS product_name, d.i_Quantity AS quantity, p.i_Price AS unit_price FROM tb_orderdetails d LEFT JOIN tb_products p ON p.i_ProductID=d.i_ProductID WHERE d.i_OrderID=?');
        $items->execute([(int)$id]);
        Response::success(['data' => ['order' => $order, 'items' => $items->fetchAll()]]);
    }

    public function store(): void
    {
        $body = Api::input();
        $data = Api::cleanInput($body, ['customer_id' => 'integer']);
        if (!isset($data['customer_id']) || !isset($body['items']) || !is_array($body['items']) || count($body['items']) === 0) {
            Response::error('customer_id and at least one order item are required.', 422);
        }
        $customer = $this->conn->prepare('SELECT 1 FROM tb_customers WHERE i_customerid = ?');
        $customer->execute([$data['customer_id']]);
        if (!$customer->fetchColumn()) {
            Response::error('The selected customer does not exist.', 422);
        }

        $items = [];
        foreach ($body['items'] as $item) {
            if (!is_array($item)) {
                Response::error('Each order item must be a JSON object.', 422);
            }
            $productId = filter_var($item['product_id'] ?? null, FILTER_VALIDATE_INT);
            $quantity = filter_var($item['quantity'] ?? null, FILTER_VALIDATE_INT);
            if ($productId === false || $quantity === false || $quantity < 1) {
                Response::error('Each item needs a valid product_id and positive quantity.', 422);
            }
            $product = $this->conn->prepare('SELECT 1 FROM tb_products WHERE i_ProductID = ?');
            $product->execute([(int)$productId]);
            if (!$product->fetchColumn()) {
                Response::error('The selected product does not exist.', 422);
            }
            $items[] = [(int)$productId, (int)$quantity];
        }

        if ((int)$this->conn->query("SELECT GET_LOCK('pj2_legacy_order_create', 5)")->fetchColumn() !== 1) {
            Response::error('Could not reserve an order number. Please try again.', 503);
        }
        try {
            $this->conn->beginTransaction();
            $orderId = (int)$this->conn->query('SELECT COALESCE(MAX(i_OrderID), 0) + 1 FROM tb_orders')->fetchColumn();
            $detailId = (int)$this->conn->query('SELECT COALESCE(MAX(i_OrderDetailID), 0) + 1 FROM tb_orderdetails')->fetchColumn();
            $stmt = $this->conn->prepare('INSERT INTO tb_orders (i_OrderID, i_CustomerID, i_EmployeeID, c_OrderDate, i_ShipperID) VALUES (?, ?, ?, ?, ?)');
            $stmt->execute([$orderId, $data['customer_id'], (int)($body['employee_id'] ?? 0), date('j/n/Y'), (int)($body['ship_via'] ?? 0)]);
            $line = $this->conn->prepare('INSERT INTO tb_orderdetails (i_OrderDetailID, i_OrderID, i_ProductID, i_Quantity) VALUES (?, ?, ?, ?)');
            foreach ($items as [$productId, $quantity]) {
                $line->execute([$detailId++, $orderId, $productId, $quantity]);
            }
            $this->conn->commit();
            Response::success(['message' => 'Order created.', 'data' => ['order_id' => $orderId]], 201);
        } catch (Throwable $error) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            throw $error;
        } finally {
            $this->conn->query("SELECT RELEASE_LOCK('pj2_legacy_order_create')");
        }
    }

    public function update(string $id): void
    {
        $data = Api::cleanInput(Api::input(), ['customer_id' => 'integer?', 'employee_id' => 'integer?', 'order_date' => 'date?', 'ship_via' => 'integer?']);
        if (!$data) {
            Response::error('Provide customer_id, employee_id, order_date, or ship_via to update.', 422);
        }
        $map = ['customer_id' => 'i_CustomerID', 'employee_id' => 'i_EmployeeID', 'order_date' => 'c_OrderDate', 'ship_via' => 'i_ShipperID'];
        $sets = [];
        $values = [];
        foreach ($data as $field => $value) {
            $sets[] = $map[$field] . ' = ?';
            $values[] = $field === 'order_date' ? date('j/n/Y', strtotime($value)) : $value;
        }
        $values[] = (int)$id;
        $stmt = $this->conn->prepare('UPDATE tb_orders SET ' . implode(',', $sets) . ' WHERE i_OrderID = ?');
        $stmt->execute($values);
        Response::success(['message' => 'Order updated.']);
    }

    public function updateStatus(string $id): void
    {
        Response::error('This database does not store order status or shipping dates.', 422);
    }

    public function destroy(string $id): void
    {
        $this->conn->beginTransaction();
        $this->conn->prepare('DELETE FROM tb_orderdetails WHERE i_OrderID = ?')->execute([(int)$id]);
        $stmt = $this->conn->prepare('DELETE FROM tb_orders WHERE i_OrderID = ?');
        $stmt->execute([(int)$id]);
        if (!$stmt->rowCount()) {
            $this->conn->rollBack();
            Response::error('Order not found.', 404);
        }
        $this->conn->commit();
        Response::success(['message' => 'Order deleted.']);
    }
}
