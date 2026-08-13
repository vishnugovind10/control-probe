from __future__ import annotations

from typing import Any, cast

from control_probe.models import MetricSpec


class AdapterConnectionError(RuntimeError):
    """Raised when an RPC endpoint cannot be reached."""


class AdapterDataError(RuntimeError):
    """Raised when on-chain data is missing or malformed."""


ERC20_ABI: list[dict[str, Any]] = [
    {
        "constant": True,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function",
    },
    {
        "constant": True,
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function",
    },
]


class EvmAdapter:
    name = "evm"

    def __init__(self, rpc_url: str, env: dict[str, str] | None = None) -> None:
        self.env = env or {}
        try:
            from web3 import Web3
        except ImportError as exc:  # pragma: no cover
            msg = "web3 is required for the EVM adapter"
            raise AdapterConnectionError(msg) from exc
        self.web3 = Web3(Web3.HTTPProvider(rpc_url))
        if not self.web3.is_connected():
            msg = f"unable to connect to RPC endpoint {rpc_url!r}"
            raise AdapterConnectionError(msg)

    def resolve_metric(self, metric: MetricSpec) -> float:
        if metric.type == "parameter":
            return self._parameter(metric)
        if metric.type == "erc20_total_supply":
            token_address = self._require_address(metric.address, "address")
            contract = self.web3.eth.contract(
                address=cast(Any, token_address),
                abi=ERC20_ABI,
            )
            raw = contract.functions.totalSupply().call()
            return self._scale(raw, metric.decimals)
        if metric.type == "erc20_balance":
            token_address = self._require_address(metric.token, "token")
            holder_address = self._require_address(metric.address, "address")
            contract = self.web3.eth.contract(
                address=cast(Any, token_address),
                abi=ERC20_ABI,
            )
            raw = contract.functions.balanceOf(holder_address).call()
            return self._scale(raw, metric.decimals)
        if metric.type == "erc20_price":
            raise AdapterDataError("erc20_price is not implemented in v0.1")
        raise AdapterDataError(f"unsupported EVM metric type {metric.type!r}")

    def _parameter(self, metric: MetricSpec) -> float:
        value = metric.value
        if isinstance(value, str) and value in self.env:
            value = self.env[value]
        if value is None:
            raise AdapterDataError(f"parameter {metric.id!r} must be numeric")
        try:
            return float(value)
        except (TypeError, ValueError) as exc:
            raise AdapterDataError(f"parameter {metric.id!r} must be numeric") from exc

    def _require_address(self, value: str | None, field: str) -> str:
        if not value:
            raise AdapterDataError(f"metric missing {field}")
        if not self.web3.is_address(value):
            raise AdapterDataError(f"invalid EVM address for {field}: {value!r}")
        return self.web3.to_checksum_address(value)

    @staticmethod
    def _scale(raw: Any, decimals: int | None) -> float:
        if decimals is None:
            raise AdapterDataError("ERC-20 metrics require decimals")
        if not isinstance(raw, int):
            raise AdapterDataError("unexpected non-integer ERC-20 return value")
        return raw / float(10**decimals)
