<?php
declare(strict_types=1);

class ResourceController
{
    public function __construct(
        protected PDO $conn,
        protected string $resourceName,
        protected array $resource
    ) {
    }

    public function index(): void
    {
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(100, max(1, (int)($_GET['limit'] ?? 20)));
        $search = trim((string)($_GET['search'] ?? ''));
        $sort = strtolower((string)($_GET['sort'] ?? 'desc')) === 'asc' ? 'ASC' : 'DESC';
        $table = $this->resource['table'];
        $dbKey = $this->resource['db_key'];
        $where = $search !== '' ? ' WHERE CAST(' . $this->resource['search_id'] . ' AS CHAR) LIKE ? OR ' . $this->resource['search'] . ' LIKE ?' : '';

        $count = $this->conn->prepare("SELECT COUNT(*) FROM $table" . $where);
        $count->execute($search !== '' ? ["%$search%", "%$search%"] : []);
        $total = (int)$count->fetchColumn();
        $page = min($page, max(1, (int)ceil($total / $limit)));

        $stmt = $this->conn->prepare($this->resource['select'] . $where . " ORDER BY $dbKey $sort LIMIT ? OFFSET ?");
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
        $stmt = $this->conn->prepare($this->resource['select'] . ' WHERE ' . $this->resource['db_key'] . ' = ?');
        $stmt->execute([(int)$id]);
        $row = $stmt->fetch();
        if (!$row) {
            Response::error('Record not found.', 404);
        }
        Response::success(['data' => $row]);
    }

    public function store(): void
    {
        $data = Api::cleanInput(Api::input(), $this->resource['fields']);
        if ($this->resourceName === 'categories') {
            $data['description'] = $data['description'] ?? '';
        }
        if ($this->resourceName === 'employees') {
            $data['notes'] = $data['notes'] ?? '';
        }
        if (array_diff_key(array_filter($this->resource['fields'], static fn($rule): bool => !str_ends_with($rule, '?')), $data)) {
            Response::error('Required fields are missing.', 422);
        }

        $this->validateProductReferences($data);
        $columns = array_keys($data);
        $physicalColumns = array_map(fn(string $column): string => $this->resource['columns'][$column], $columns);
        $values = array_values($data);
        $dbKey = $this->resource['db_key'];

        if (!empty($this->resource['auto_increment'])) {
            $sql = 'INSERT INTO ' . $this->resource['table'] . ' (' . implode(',', $physicalColumns) . ') VALUES (' . implode(',', array_fill(0, count($physicalColumns), '?')) . ')';
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($values);
            $id = (int)$this->conn->lastInsertId();
        } else {
            $lockName = 'pj2_create_' . $this->resourceName;
            if ((int)$this->conn->query("SELECT GET_LOCK('$lockName', 5)")->fetchColumn() !== 1) {
                Response::error('Could not reserve a record number. Please try again.', 503);
            }
            try {
                $id = (int)$this->conn->query('SELECT COALESCE(MAX(' . $dbKey . '), 0) + 1 FROM ' . $this->resource['table'])->fetchColumn();
                $physicalColumns[] = $dbKey;
                $values[] = $id;
                if ($this->resourceName === 'employees') {
                    $physicalColumns = [...$physicalColumns, 'c_BirthDate', 'c_Photo'];
                    $values = [...$values, '', ''];
                }
                $sql = 'INSERT INTO ' . $this->resource['table'] . ' (' . implode(',', $physicalColumns) . ') VALUES (' . implode(',', array_fill(0, count($physicalColumns), '?')) . ')';
                $stmt = $this->conn->prepare($sql);
                $stmt->execute($values);
            } finally {
                $this->conn->query("SELECT RELEASE_LOCK('$lockName')");
            }
        }
        Response::success(['message' => 'Record created.', 'data' => [$this->resource['key'] => $id]], 201);
    }

    public function update(string $id): void
    {
        $data = Api::cleanInput(Api::input(), $this->resource['fields']);
        if ($this->resourceName === 'employees' && array_key_exists('notes', $data) && $data['notes'] === null) {
            $data['notes'] = '';
        }
        if (!$data) {
            Response::error('Provide at least one field to update.', 422);
        }
        $this->validateProductReferences($data);
        $sets = [];
        $values = [];
        foreach ($data as $field => $value) {
            $sets[] = $this->resource['columns'][$field] . ' = ?';
            $values[] = $value;
        }
        $values[] = (int)$id;
        $stmt = $this->conn->prepare('UPDATE ' . $this->resource['table'] . ' SET ' . implode(',', $sets) . ' WHERE ' . $this->resource['db_key'] . ' = ?');
        $stmt->execute($values);
        Response::success(['message' => 'Record updated.']);
    }

    public function destroy(string $id): void
    {
        $references = [
            'products' => ['tb_orderdetails', 'i_ProductID'],
            'categories' => ['tb_products', 'i_CategoryID'],
            'suppliers' => ['tb_products', 'i_SupplierID'],
            'customers' => ['tb_orders', 'i_CustomerID'],
            'employees' => ['tb_orders', 'i_EmployeeID'],
            'shippers' => ['tb_orders', 'i_ShipperID'],
        ];
        [$referenceTable, $referenceColumn] = $references[$this->resourceName];
        $reference = $this->conn->prepare("SELECT 1 FROM $referenceTable WHERE $referenceColumn = ? LIMIT 1");
        $reference->execute([(int)$id]);
        if ($reference->fetchColumn()) {
            Response::error('This record is referenced by existing data and cannot be deleted.', 409);
        }
        $stmt = $this->conn->prepare('DELETE FROM ' . $this->resource['table'] . ' WHERE ' . $this->resource['db_key'] . ' = ?');
        $stmt->execute([(int)$id]);
        if (!$stmt->rowCount()) {
            Response::error('Record not found.', 404);
        }
        Response::success(['message' => 'Record deleted.']);
    }

    private function validateProductReferences(array $data): void
    {
        if ($this->resourceName !== 'products') {
            return;
        }
        foreach (['supplier_id' => ['tb_suppliers', 'i_SupplierID'], 'category_id' => ['tb_categories', 'i_CategoryID']] as $field => [$table, $column]) {
            if (!array_key_exists($field, $data)) {
                continue;
            }
            $stmt = $this->conn->prepare("SELECT 1 FROM $table WHERE $column = ?");
            $stmt->execute([$data[$field]]);
            if (!$stmt->fetchColumn()) {
                Response::error("The selected $field does not exist.", 422);
            }
        }
    }
}
